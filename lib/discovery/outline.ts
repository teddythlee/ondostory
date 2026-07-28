// 채택 시 만들어지는 "초안 골격".
//
// 왜 완성 초안이 아니라 골격인가 —
// docs/ondostory-content-guide.md §1-2 정직성 규칙상 겪지 않은 경험을 지어낼 수 없다.
// LLM에 전체 본문을 맡기면 반드시 그 선을 넘는다(안 가본 집 맛을 쓰고, 안 해본 절차를
// how-to로 제시한다). 그래서 자동화는 "사람이 채워야 할 자리를 정확히 파놓는" 데까지만 한다.
//   - 기계가 하는 것: 무엇을 쓸지, 어떤 구조로, 무엇을 조사해 넣을지, 어디에 링크할지
//   - 사람이 하는 것: 실제로 겪은 것
// 이 골격이 post_ideas.bullets로 들어가고, 그다음은 기존 초안 파이프라인 그대로다.

import type { IdeaCandidate } from './types'
import { planFor } from './plan'

export interface RelatedPost {
  title: string
  slug: string
  cluster: string | null
}

const SOURCE_LABEL: Record<string, string> = {
  gsc_gap: '서치콘솔 기회 검색어',
  gsc_lowctr: '서치콘솔 저CTR 페이지',
  suggest: '구글 자동완성',
  community: '커뮤니티 질문',
  internal_gap: '클러스터 배분 갭',
}

/** 제목 규칙(가이드 §3) 두 패턴에 맞춘 후보. 그대로 쓰지 말고 고르라는 뜻의 초안. */
function titleCandidates(c: IdeaCandidate): string[] {
  const core = (c.query || c.topic).replace(/^\[[^\]]+\]\s*/, '').replace(/^"|"$/g, '').trim()
  return [
    `${core} 후기 | 실제 비용·절차·준비물 정리`,
    `${core} — 직접 해보고 알게 된 것들`,
    `${core}, 처음이라 헤맨 순서 그대로`,
  ]
}

function evidenceLines(c: IdeaCandidate): string[] {
  const e = c.evidence || {}
  const lines: string[] = [`소스: ${SOURCE_LABEL[c.source] ?? c.source} (점수 ${c.score})`]
  if (c.impressions) lines.push(`노출 ${c.impressions}회 · 평균 ${c.position?.toFixed(1) ?? '?'}위`)
  if (typeof e.url === 'string') lines.push(`원문: ${e.url}`)
  if (typeof e.slug === 'string') lines.push(`대상 글: /blog/${e.slug}`)
  if (typeof e.seed === 'string') lines.push(`시드 검색어: ${e.seed}`)
  if (c.seen_count > 1) lines.push(`${c.seen_count}일 연속 잡힌 신호 — 일시적 유행이 아니다`)
  return lines
}

export function buildOutline(c: IdeaCandidate, related: RelatedPost[]): { topic: string; bullets: string } {
  const isRewrite = c.source === 'gsc_lowctr'
  const isBoost = c.source === 'gsc_gap' && c.evidence?.hasOwnPost === true
  const sameCluster = related.filter((p) => p.cluster === c.cluster).slice(0, 4)

  const L: string[] = []
  L.push(`기타: [자동 발굴 ${c.first_seen_on}] ${c.rationale}`)
  L.push('')
  L.push('■ 근거')
  evidenceLines(c).forEach((l) => L.push(`  - ${l}`))
  L.push('')

  if (isRewrite) {
    L.push('■ 할 일 — 새 글이 아니라 리라이트')
    L.push('  - 이 글은 노출은 나오는데 클릭이 안 붙는다. 본문이 아니라 제목·메타를 고친다.')
    L.push('  - 제목에 검색어를 앞쪽에 넣고, 숫자·결과·구체 대상을 하나 박는다.')
    L.push('  - meta_description을 excerpt 복붙이 아닌 별도 문장으로 다시 쓴다(가이드 §3).')
    L.push('  - 고친 뒤 /admin/topics 스냅샷으로 2~4주 후 순위·CTR 변화를 확인한다.')
  } else if (isBoost) {
    L.push('■ 할 일 — 새 글이 아니라 기존 글 보강')
    L.push('  - 이미 이 검색어로 잡히는 글이 있다. 그 글 안에 이 검색어를 정면으로 받는 섹션을 추가한다.')
    L.push('  - 소제목은 목차 라벨이 아니라 문장형으로(가이드 §2 공통 규칙).')
    L.push('  - 새로 쓰면 자기 글끼리 경쟁(카니벌라이제이션)이 생긴다 — 반드시 기존 글에 붙인다.')
  } else {
    L.push('■ 제목 후보 (고르거나 섞어서, 그대로 쓰지 말 것)')
    titleCandidates(c).forEach((t) => L.push(`  - ${t}`))
  }
  L.push('')

  L.push('■ 내가 채워야 할 것 — 겪은 것만')
  L.push('  - 어떤 상황에서 이걸 하게 됐나 (도입에 쓸 장면 하나)')
  L.push('  - 실제로 밟은 순서와, 그중 막혔던 지점')
  L.push('  - 실제 비용·모델명·지명·소요 시간 (두루뭉술 금지)')
  L.push('  - 솔직히 아쉬웠던 점 하나 이상 (§1-2 정직성 — 무조건 칭찬 금지)')
  L.push('  - 다시 한다면 뭘 다르게 할 것인가')
  if (c.cluster === 'settlement' || c.cluster === 'housing') {
    L.push('  - (업체·병원·정비면) 한국어 되는 곳인가 — 사실일 때만')
  }
  L.push('')

  L.push('■ 조사해서 한 겹 얹을 것 (§2.5 정보 층)')
  L.push('  - 공개 사실(제도·기준·절차)을 검색해 넣되 "알아보니 ~라고 한다"로 프레이밍')
  L.push('  - 안 해본 방법을 how-to 단계로 제시하지 않는다 — 소개까지만')
  L.push('  - 놀라운 수치가 있으면 "왜 그런지"를 붙인다')
  L.push('')

  if (sameCluster.length) {
    L.push('■ 내부링크 후보 (같은 클러스터)')
    sameCluster.forEach((p) => L.push(`  - /blog/${p.slug} — ${p.title}`))
    L.push('')
  }

  const plan = planFor(c.cluster)
  L.push('■ 메타')
  L.push(`  - 클러스터: ${c.cluster ?? '(미분류 — 채택 시 지정할 것)'} · 목표 ${plan.target}건`)
  L.push(`  - 분량: 본문 2,500자 이상 (§2 공통 규칙)`)
  L.push(`  - 문체: 평서체 반말, 1인칭 "나", 짧은 문장 (§1-1)`)

  return { topic: c.topic, bullets: L.join('\n') }
}
