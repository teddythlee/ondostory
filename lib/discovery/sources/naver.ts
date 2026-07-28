// 소스 5: 네이버 자동완성.
//
// 이 블로그의 독자는 한국어로, 대부분 네이버에서 검색한다. 구글 자동완성(suggest)이
// 잡지 못하는 "한국인이 실제로 치는 문장"을 여기서 잡는다 — 죽어 있던 레딧(영어권)을
// 대체하는, 방향이 맞는 외부 수요 신호다.
//
// ac.search.naver.com 자동완성 엔드포인트는 키가 필요 없다. 다만 공식 API가 아니고
// 클라우드 IP에서 막힐 수 있으므로, 실패는 조용히 건너뛴다(다른 소스는 그대로 진행).

import type { RawCandidate } from '../types'
import { CLUSTER_PLAN } from '../plan'

const ENDPOINT = 'https://ac.search.naver.com/nx/ac'
// 시드 뒤에 붙여 롱테일을 벌리는 접미사. 구글 쪽과 겹치지 않게 네이버에서 잘 먹는 것 위주.
const MODIFIERS = ['', ' 방법', ' 비용', ' 후기', ' 추천', ' 준비물', ' 신청']

interface NaverAc {
  items?: unknown[][]
}

async function suggest(term: string): Promise<string[]> {
  const params = new URLSearchParams({
    q: term,
    con: '1',
    frm: 'nv',
    ans: '2',
    r_format: 'json',
    r_enc: 'UTF-8',
    r_unicode: '0',
    t_koreng: '1',
    q_enc: 'UTF-8',
    st: '100',
  })
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://www.naver.com/',
    },
  })
  if (!res.ok) throw new Error(`naver ${res.status}`)
  // 응답 형태: { query:[...], items:[ [ ["제안1",...], ["제안2",...] ] ] }
  const data = (await res.json()) as NaverAc
  const rows = Array.isArray(data?.items?.[0]) ? (data.items![0] as unknown[]) : []
  return rows
    .map((row) => (Array.isArray(row) ? String(row[0] ?? '') : ''))
    .filter(Boolean)
}

/** 접미사 → 시드 → 클러스터 순 라운드로빈. 예산이 작아도 6클러스터가 골고루 잡힌다. */
function buildTerms(): { cluster: string; term: string }[] {
  const terms: { cluster: string; term: string }[] = []
  const lists = Object.entries(CLUSTER_PLAN).map(([cluster, plan]) => ({ cluster, seeds: plan.seeds }))
  const maxSeeds = Math.max(...lists.map((l) => l.seeds.length))
  for (const mod of MODIFIERS) {
    for (let s = 0; s < maxSeeds; s++) {
      for (const { cluster, seeds } of lists) {
        if (seeds[s]) terms.push({ cluster, term: `${seeds[s]}${mod}` })
      }
    }
  }
  return terms
}

/** @param maxCalls Workers 서브리퀘스트 예산에 맞춘 조회 수 상한 */
export async function collectFromNaver(maxCalls = 12): Promise<{ candidates: RawCandidate[]; note: string }> {
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
      if (!phrase || phrase.length < 5) return
      out.push({
        topic: phrase,
        query: phrase,
        cluster,
        // 자동완성 상위일수록 검색량이 많다 — 순위를 수요 대리값으로.
        demand: Math.max(1, 10 - rank * 1.5),
        evidence: { seed: term, rank, engine: 'naver' },
        rationale: `네이버에서 "${term}" 치면 ${rank + 1}번째로 뜨는 자동완성. 한국인이 이 문장 그대로 검색한다는 뜻이다.`,
        source: 'naver',
      })
    })
  }

  return {
    candidates: out,
    note: failed === calls && calls > 0
      ? '네이버 전체 실패 (클라우드 IP 차단 가능)'
      : `${calls}회 조회 중 ${failed}회 실패 · 제안 ${out.length}건`,
  }
}
