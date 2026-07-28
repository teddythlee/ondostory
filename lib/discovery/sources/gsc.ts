// 소스 1·2: Google Search Console.
//
// 내 사이트가 실제로 만들어낸 데이터라 4개 소스 중 가장 확실하다.
//   gsc_gap    노출은 나오는데 8~20위 → 한 계단만 밀면 클릭이 붙는 검색어.
//              이미 랭킹 글이 있으면 "보강", 없으면 "신규 글" 후보다.
//   gsc_lowctr 노출 대비 CTR이 낮은 페이지 → 제목·메타 리라이트 후보.

import { getGscInsights } from '@/lib/gsc'
import type { RawCandidate } from '../types'
import { guessCluster } from '../cluster-match'

/** GSC 페이지 URL → 블로그 slug */
function slugOf(url: string): string | null {
  const m = (url || '').match(/\/blog\/([^/?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export async function collectFromGsc(
  publishedSlugs: Set<string>,
  recentlyModified: Set<string> = new Set()
): Promise<{ candidates: RawCandidate[]; note: string }> {
  const insights = await getGscInsights()
  if (!insights.configured) return { candidates: [], note: 'GSC 미설정 (GOOGLE_SERVICE_ACCOUNT_KEY 없음)' }
  if (insights.error) throw new Error(insights.error)

  const out: RawCandidate[] = []

  // ── gsc_gap: 8~20위 기회 검색어 ────────────────────────────────────
  // 이 검색어로 이미 랭킹된 페이지가 있는지 queryPages로 확인해서,
  // 있으면 "기존 글 보강", 없으면 "신규 글"로 성격을 나눈다.
  const pageForQuery = new Map<string, string>()
  for (const qp of insights.queryPages) {
    if (!pageForQuery.has(qp.query)) pageForQuery.set(qp.query, qp.page)
  }

  for (const row of insights.opportunities) {
    const q = row.keys[0]
    if (!q) continue
    const landing = pageForQuery.get(q)
    const slug = landing ? slugOf(landing) : null
    const hasOwnPost = !!slug && publishedSlugs.has(slug)

    out.push({
      topic: hasOwnPost
        ? `[보강] "${q}" 섹션을 기존 글에 추가`
        : `"${q}" 검색어를 정면으로 받는 글`,
      query: q,
      cluster: guessCluster(q),
      source: 'gsc_gap',
      demand: row.impressions,
      impressions: row.impressions,
      position: row.position,
      evidence: { landingPage: landing ?? null, slug, hasOwnPost, ctr: row.ctr, clicks: row.clicks },
      rationale: hasOwnPost
        ? `평균 ${row.position.toFixed(1)}위로 ${row.impressions}회 노출 중인데 클릭은 ${row.clicks}회. 이미 ${slug} 글이 잡고 있으니, 새로 쓰기보다 그 글에 이 검색어를 정면으로 받는 섹션을 넣는 게 빠르다.`
        : `평균 ${row.position.toFixed(1)}위로 ${row.impressions}회 노출되지만 이 검색어를 정면으로 받는 글이 없다. 전용 글을 쓰면 순위가 올라올 여지가 크다.`,
    })
  }

  // ── gsc_lowctr: 노출은 있는데 CTR이 낮은 기존 페이지 ────────────────
  // 단, 최근 수정된 글은 뺀다 — 방금 제목·메타를 바꿨다면 효과가 쌓일 시간을 줘야지,
  // 또 바꾸면 이전 변경의 성과를 영영 측정 못 한다.
  let skippedRecent = 0
  for (const row of insights.lowCtrPages) {
    const url = row.keys[0]
    const slug = slugOf(url)
    if (!slug || !publishedSlugs.has(slug)) continue
    if (recentlyModified.has(slug)) {
      skippedRecent++
      continue
    }
    out.push({
      topic: `[리라이트] ${slug} — 제목·메타 다시 쓰기`,
      cluster: null, // orchestrator가 실제 글의 cluster로 채운다
      source: 'gsc_lowctr',
      demand: row.impressions,
      impressions: row.impressions,
      position: row.position,
      evidence: { page: url, slug, ctr: row.ctr, clicks: row.clicks },
      rationale: `${row.impressions}회 노출에 CTR ${(row.ctr * 100).toFixed(1)}% (평균 ${row.position.toFixed(1)}위). 새 글 한 편을 쓰는 것보다 이 글 제목·메타를 고치는 쪽이 클릭 회수 비용이 훨씬 싸다.`,
    })
  }

  return {
    candidates: out,
    note: `${insights.range.startDate}~${insights.range.endDate} 기준 · 기회 검색어 ${insights.opportunities.length} · 저CTR 페이지 ${insights.lowCtrPages.length}${skippedRecent ? ` (최근수정 ${skippedRecent} 제외)` : ''}`,
  }
}
