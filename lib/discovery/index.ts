// 글감 발굴 오케스트레이터.
//
// 매일 크론이 이 함수 하나를 부른다. 소스 4개를 병렬로 돌리고, 한 곳이 죽어도
// 나머지는 그대로 진행한다(errors에 남긴다). 결과는 idea_candidates에 upsert —
// 이미 있던 후보면 점수만 갱신하고 seen_count를 올린다. 며칠 연속 잡히는 후보가
// 진짜 신호이므로, 그 자체가 우선순위 정보가 된다.

import { supabaseAdmin } from '@/lib/supabase'
import { collectFromGsc } from './sources/gsc'
import { collectFromSuggest } from './sources/suggest'
import { collectFromNaver } from './sources/naver'
import { collectFromCommunity } from './sources/community'
import { collectFromInternal } from './sources/internal'
import { scoreCandidate, normalizeKey } from './score'
import type { RawCandidate, ScoredCandidate, CandidateSource } from './types'

export interface DiscoveryOptions {
  /** 구글 자동완성 호출 상한 (Workers 서브리퀘스트 예산) */
  suggestCalls?: number
  /** 네이버 자동완성 호출 상한 */
  naverCalls?: number
  /** 레딧 조회 상한 (기본 0 — 클라우드 IP 차단이라 꺼둔다) */
  communityProbes?: number
  /** 한 번에 저장할 최대 후보 수 — 점수 상위부터 자른다 */
  limit?: number
}

export interface DiscoveryResult {
  ok: boolean
  inserted: number
  refreshed: number
  bySource: Record<string, number>
  notes: Record<string, string>
  errors: { source: string; message: string }[]
}

interface PostRow {
  title: string
  slug: string
  cluster: string | null
  status: string
  updated_at: string
}

/** 제목 뭉치와 대조해 이미 다룬 주제인지 대략 판정 */
function makeCoverageCheck(posts: PostRow[]) {
  const keys = posts.map((p) => normalizeKey(p.title))
  return (topic: string): boolean => {
    const k = normalizeKey(topic)
    if (k.length < 6) return false
    return keys.some((existing) => existing.includes(k) || k.includes(existing))
  }
}

export async function runDiscovery(opts: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const { suggestCalls = 16, naverCalls = 12, communityProbes = 0, limit = 60 } = opts

  const { data: runRow } = await supabaseAdmin
    .from('idea_discovery_runs')
    .insert({})
    .select('id')
    .single()
  const runId: string | undefined = runRow?.id

  const errors: { source: string; message: string }[] = []
  const notes: Record<string, string> = {}
  const bySource: Record<string, number> = {}

  // ── 기존 글 로드 (중복 판정 · 클러스터 카운트 · 슬러그 매칭에 모두 쓰인다) ──
  const { data: postsData, error: postsErr } = await supabaseAdmin
    .from('posts')
    .select('title, slug, cluster, status, updated_at')
  if (postsErr) throw postsErr
  const posts = (postsData || []) as PostRow[]
  const published = posts.filter((p) => p.status === 'published')
  const publishedSlugs = new Set(published.map((p) => p.slug))
  const clusterBySlug = new Map(posts.map((p) => [p.slug, p.cluster]))
  const publishedByCluster: Record<string, number> = {}
  for (const p of published) if (p.cluster) publishedByCluster[p.cluster] = (publishedByCluster[p.cluster] || 0) + 1
  // 최근 42일 안에 수정된 글 — 리라이트(gsc_lowctr) 후보에서 뺀다(제목 변경 효과 측정 시간 확보)
  const recentCutoff = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString()
  const recentlyModified = new Set(
    published.filter((p) => p.updated_at && p.updated_at > recentCutoff).map((p) => p.slug)
  )

  // ── 소스 4개 병렬 수집 ────────────────────────────────────────────
  const settled = await Promise.allSettled([
    collectFromGsc(publishedSlugs, recentlyModified),
    collectFromSuggest(suggestCalls),
    collectFromNaver(naverCalls),
    collectFromCommunity(communityProbes),
    collectFromInternal(),
  ])
  const names = ['gsc', 'suggest', 'naver', 'community', 'internal']

  let raw: RawCandidate[] = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      raw = raw.concat(r.value.candidates)
      notes[names[i]] = r.value.note
    } else {
      errors.push({ source: names[i], message: r.reason instanceof Error ? r.reason.message : String(r.reason) })
      notes[names[i]] = '실패'
    }
  })

  // 저CTR 후보는 대상 글의 실제 클러스터를 물려받는다
  for (const c of raw) {
    if (c.cluster === null && typeof c.evidence?.slug === 'string') {
      c.cluster = clusterBySlug.get(c.evidence.slug as string) ?? null
    }
    bySource[c.source] = (bySource[c.source] || 0) + 1
  }

  // ── 이미 다룬 주제 제외 (보강·리라이트는 기존 글 대상이므로 통과) ──────
  const isCovered = makeCoverageCheck(posts)
  const fresh = raw.filter((c) => {
    if (c.source === 'gsc_lowctr') return true
    if (c.source === 'gsc_gap' && c.evidence?.hasOwnPost) return true
    return !isCovered(c.query ?? c.topic)
  })

  // ── 점수 매기고 배치 내 중복 제거 (같은 dedupKey는 최고점만) ───────────
  const scored = new Map<string, ScoredCandidate>()
  for (const c of fresh) {
    const s = scoreCandidate(c, publishedByCluster)
    const prev = scored.get(s.dedupKey)
    if (!prev || s.score > prev.score) scored.set(s.dedupKey, s)
  }
  const ranked = [...scored.values()].sort((a, b) => b.score - a.score).slice(0, limit)

  // ── 기존 후보와 대조 ──────────────────────────────────────────────
  const keys = ranked.map((c) => c.dedupKey)
  const existing = new Map<string, { id: string; status: string; score: number; seen_count: number }>()
  for (let i = 0; i < keys.length; i += 150) {
    const { data } = await supabaseAdmin
      .from('idea_candidates')
      .select('id, dedup_key, status, score, seen_count')
      .in('dedup_key', keys.slice(i, i + 150))
    for (const row of data || []) existing.set(row.dedup_key, row)
  }

  const today = new Date().toISOString().slice(0, 10)
  const toInsert: Record<string, unknown>[] = []
  let refreshed = 0

  for (const c of ranked) {
    const prev = existing.get(c.dedupKey)
    if (!prev) {
      toInsert.push({
        topic: c.topic,
        query: c.query ?? null,
        cluster: c.cluster,
        source: c.source,
        score: c.score,
        impressions: c.impressions ?? 0,
        position: c.position ?? null,
        evidence: c.evidence ?? {},
        rationale: c.rationale,
        dedup_key: c.dedupKey,
        first_seen_on: today,
        last_seen_on: today,
      })
      continue
    }
    // 이미 처리한(채택·기각) 후보는 다시 올리지 않는다
    if (prev.status !== 'new') continue
    await supabaseAdmin
      .from('idea_candidates')
      .update({
        score: Math.max(prev.score, c.score),
        impressions: c.impressions ?? 0,
        position: c.position ?? null,
        evidence: c.evidence ?? {},
        rationale: c.rationale,
        last_seen_on: today,
        seen_count: prev.seen_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prev.id)
    refreshed++
  }

  let inserted = 0
  if (toInsert.length) {
    const { data, error } = await supabaseAdmin.from('idea_candidates').insert(toInsert).select('id')
    if (error) throw error
    inserted = data?.length ?? 0
  }

  const ok = errors.length < names.length
  if (runId) {
    await supabaseAdmin
      .from('idea_discovery_runs')
      .update({
        finished_at: new Date().toISOString(),
        ok,
        inserted,
        refreshed,
        by_source: { ...bySource, notes },
        errors,
      })
      .eq('id', runId)
  }

  return { ok, inserted, refreshed, bySource, notes, errors }
}

export type { CandidateSource }
