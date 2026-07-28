// 소스 3: 구글 자동완성 / 연관검색.
//
// 사람들이 실제로 치는 롱테일 질문을 키 없이 긁을 수 있는 창구다.
// 클러스터별 시드 키워드에 의문형 접미사를 붙여 확장한다.
// 공식 API가 아니므로 실패할 수 있다 — 실패는 조용히 건너뛴다.

import type { RawCandidate } from '../types'
import { CLUSTER_PLAN } from '../plan'

const ENDPOINT = 'https://suggestqueries.google.com/complete/search'
// 시드 뒤에 붙여 롱테일을 벌리는 의미형 접미사. 질문형이 그대로 글감이 된다.
const MODIFIERS = ['', ' 방법', ' 비용', ' 준비물', ' 후기', ' 어떻게', ' 얼마', ' 처음', ' 추천', ' 신청']
// 자모/알파벳 수프 — 시드 뒤에 한 글자씩 붙여 의미형이 못 잡는 롱테일까지 벌린다.
const SOUP = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '파', '하', '비', '신', 'a', 's']

async function suggest(term: string): Promise<string[]> {
  const url = `${ENDPOINT}?client=firefox&hl=ko&gl=us&q=${encodeURIComponent(term)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ondostory-discovery/1.0)' },
  })
  if (!res.ok) throw new Error(`suggest ${res.status}`)
  // 응답 형태: ["원본어", ["제안1","제안2",...]]
  const data = (await res.json()) as [string, string[]]
  return Array.isArray(data?.[1]) ? data[1] : []
}

/** 접미사 목록 → (클러스터, 검색어)를 접미사 → 시드 → 클러스터 순 라운드로빈으로 펼친다. */
function termsFrom(suffixes: string[]): { cluster: string; term: string }[] {
  const terms: { cluster: string; term: string }[] = []
  const lists = Object.entries(CLUSTER_PLAN).map(([cluster, plan]) => ({ cluster, seeds: plan.seeds }))
  const maxSeeds = Math.max(...lists.map((l) => l.seeds.length))
  for (const suf of suffixes) {
    for (let s = 0; s < maxSeeds; s++) {
      for (const { cluster, seeds } of lists) {
        if (seeds[s]) terms.push({ cluster, term: `${seeds[s]}${suf}` })
      }
    }
  }
  return terms
}

/**
 * 의미형 접미사(우선)와 자모/알파벳 수프(다양성)를 2:1로 인터리브한다.
 * 예산이 작아도 의미형이 앞서되 수프도 1/3쯤 airtime을 얻어, 예상 못 한 롱테일까지 벌린다.
 */
function buildTerms(): { cluster: string; term: string }[] {
  const semantic = termsFrom(MODIFIERS)
  const soup = termsFrom(SOUP.map((c) => ` ${c}`))
  const out: { cluster: string; term: string }[] = []
  let i = 0
  let j = 0
  while (i < semantic.length || j < soup.length) {
    if (i < semantic.length) out.push(semantic[i++])
    if (i < semantic.length) out.push(semantic[i++])
    if (j < soup.length) out.push(soup[j++])
  }
  return out
}

/**
 * @param maxCalls Cloudflare Workers 서브리퀘스트 한도(무료 50 / 유료 1000)를 넘지 않도록
 *   전체 호출 수를 제한한다.
 */
export async function collectFromSuggest(maxCalls = 16): Promise<{ candidates: RawCandidate[]; note: string }> {
  const out: RawCandidate[] = []
  let calls = 0
  let failed = 0

  for (const { cluster, term } of buildTerms()) {
    if (calls >= maxCalls) break
    calls++
    let results: string[]
    try {
      results = await suggest(term)
    } catch {
      failed++
      continue
    }
    results.slice(0, 6).forEach((phrase, rank) => {
      if (!phrase || phrase.length < 6) return
      out.push({
        topic: phrase,
        query: phrase,
        cluster,
        // 자동완성 상위일수록 실제 검색량이 많다 — 순위를 수요 대리값으로 쓴다.
        demand: Math.max(1, 10 - rank * 1.5),
        evidence: { seed: term, rank },
        rationale: `"${term}" 자동완성 ${rank + 1}번째. 사람들이 이 문장 그대로 검색한다는 뜻이다.`,
        source: 'suggest',
      })
    })
  }

  return { candidates: out, note: `${calls}회 조회 중 ${failed}회 실패 · 제안 ${out.length}건` }
}
