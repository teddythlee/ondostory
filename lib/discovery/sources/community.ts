// 소스 4: 커뮤니티 (Reddit).
//
// "아직 한국어로 정리된 글이 없는데 사람들은 계속 묻는" 주제를 잡는 창구.
// 레딧 공개 검색 JSON을 쓴다 — 키가 필요 없는 대신 클라우드 IP는 종종 차단당하므로
// 실패를 정상 경로로 취급한다(다른 소스는 그대로 진행).

import type { RawCandidate } from '../types'
import { guessCluster } from '../cluster-match'

interface RedditChild {
  data: {
    title: string
    permalink: string
    subreddit: string
    score: number
    num_comments: number
    created_utc: number
  }
}

// 클러스터별로 뒤질 서브레딧과 영어 질의.
// 한인 독자가 겪는 문제는 대부분 "미국 생활 실무"라 영어 커뮤니티에 원형이 있다.
const PROBES: { cluster: string; sub: string; q: string }[] = [
  { cluster: 'housing', sub: 'orangecounty', q: 'apartment lease deposit' },
  { cluster: 'housing', sub: 'irvine', q: 'renting apartment' },
  { cluster: 'kids', sub: 'irvine', q: 'school enrollment district' },
  { cluster: 'kids', sub: 'orangecounty', q: 'elementary school registration' },
  { cluster: 'settlement', sub: 'USCIS', q: 'visa bulletin priority date' },
  { cluster: 'settlement', sub: 'immigration', q: 'green card documents translation' },
  { cluster: 'settlement', sub: 'personalfinance', q: 'building credit new immigrant' },
  { cluster: 'shopping', sub: 'orangecounty', q: 'where to buy' },
  { cluster: 'food', sub: 'orangecounty', q: 'korean restaurant' },
  { cluster: 'travel', sub: 'orangecounty', q: 'weekend trip' },
]

async function search(sub: string, q: string): Promise<RedditChild[]> {
  const url =
    `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
    `?q=${encodeURIComponent(q)}&restrict_sr=1&sort=top&t=year&limit=15`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'web:ondostory-discovery:v1.0 (by /u/ondostory)' },
  })
  if (!res.ok) throw new Error(`reddit ${sub} ${res.status}`)
  const data = (await res.json()) as { data?: { children?: RedditChild[] } }
  return data?.data?.children ?? []
}

/** 질문형 제목만 남긴다 — 답을 원하는 글이 곧 글감이다. */
function isQuestion(title: string): boolean {
  return /\?|^(how|what|where|when|which|is|are|can|do|does|should|anyone|any one)\b/i.test(title)
}

/** @param maxProbes Workers 서브리퀘스트 예산에 맞춘 조회 수 상한 */
export async function collectFromCommunity(maxProbes = 8): Promise<{ candidates: RawCandidate[]; note: string }> {
  if (maxProbes <= 0) return { candidates: [], note: '꺼둠 (community=0)' }

  const out: RawCandidate[] = []
  let failed = 0
  const probes = PROBES.slice(0, maxProbes)

  for (const probe of probes) {
    let children: RedditChild[]
    try {
      children = await search(probe.sub, probe.q)
    } catch {
      failed++
      continue
    }
    for (const c of children) {
      const d = c.data
      if (!d?.title || !isQuestion(d.title)) continue
      const engagement = (d.score || 0) + (d.num_comments || 0) * 2
      if (engagement < 5) continue
      out.push({
        topic: `${d.title} — 한국어로 정리한 글`,
        query: d.title,
        cluster: guessCluster(d.title) ?? probe.cluster,
        source: 'community',
        demand: engagement,
        evidence: {
          subreddit: d.subreddit,
          url: `https://www.reddit.com${d.permalink}`,
          score: d.score,
          comments: d.num_comments,
        },
        rationale: `r/${d.subreddit}에서 댓글 ${d.num_comments}개가 붙은 질문. 영어권에서도 반복되는 문제인데 한국어로 정리된 글은 드물다 — 다만 내가 겪은 범위 안에서만 쓸 것.`,
      })
    }
  }

  return {
    candidates: out,
    note: failed === probes.length ? '레딧 전체 실패 (클라우드 IP 차단 가능)' : `${probes.length}개 프로브 중 ${failed}개 실패 · 질문 ${out.length}건`,
  }
}
