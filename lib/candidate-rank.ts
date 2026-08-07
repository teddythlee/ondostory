// 발굴 후보 재랭킹 — "돈 되고(RPM) · 클릭되고(후킹) · 이길 수 있는(winnable)" 순으로.
//
// idea_candidates.score는 수요 신호(자동완성 순위·GSC 노출)만 반영한다. 그대로 쓰면
// "미국 쇼핑" 같은 초광역·저단가·저후킹 헤드텀이 위로 뜬다. 여기서 세 배율을 곱해
// 실제로 써야 할 주제(고RPM·후킹·롱테일)를 위로 올린다.
//
//   final = demand(원 score) × rpm등급 × 후킹 × winnable
//
// RPM등급은 AdSense 승인 전이라 미국 광고단가 기준 '정적 CPC 휴리스틱'이다.
// 승인 후 post_metrics 실측 RPM이 쌓이면 RPM_BY_CLUSTER를 실측값으로 교체·보정한다.

import type { IdeaCandidate } from './discovery/types'

// 미국 광고단가: 금융·보험·법률·세금 최상 → 부동산 상 → 교육 중 → 쇼핑·음식·여행 하
const RPM_BY_CLUSTER: Record<string, number> = {
  settlement: 1.0, // 은행·크레딧·보험·세금·이민·SSN
  car: 0.85, // 자동차 보험·DMV (남아 있으면)
  housing: 0.8, // 렌트·이사·유틸리티·렌터스보험
  kids: 0.6, // 학교·학군·튜터링
  shopping: 0.42, // 저단가지만 제휴 여지
  travel: 0.32,
  food: 0.3,
}
// 클러스터와 무관하게 주제어가 고/저단가면 보정
const HIGH_RPM_KW = ['보험', '세금', '텍스', 'tax', '크레딧', 'credit', '대출', '융자', '모기지', '이자', '이민', '비자', '영주권', '시민권', '변호사', '은행', '계좌', 'ssn', '401k', 'ira', '투자', '연금']
const LOW_RPM_KW = ['맛집', '후기', '나들이', '산책', '불꽃', '축제', '디저트', '카페', '빙수']

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
function stripPrefix(topic: string): string {
  return topic.replace(/^\[[^\]]+\]\s*/, '') // "[보강] ...", "[리라이트] ..." 접두 제거
}

export function rpmTier(c: Pick<IdeaCandidate, 'cluster' | 'topic' | 'query'>): number {
  let base = RPM_BY_CLUSTER[c.cluster ?? ''] ?? 0.5
  const t = (c.topic + ' ' + (c.query ?? '')).toLowerCase()
  if (HIGH_RPM_KW.some((k) => t.includes(k))) base = Math.max(base, 0.95)
  if (LOW_RPM_KW.some((k) => t.includes(k))) base = Math.min(base, 0.4)
  return base
}

export function hookScore(c: Pick<IdeaCandidate, 'topic' | 'source' | 'impressions'>): number {
  const topic = stripPrefix(c.topic)
  const words = topic.trim().split(/\s+/).length
  let h = 0.6
  if (c.source === 'internal_gap') h = 1.25 // 경험 기반 = 후킹·차별성 최고
  else if (c.source === 'seasonal') h = 1.15 // 시기성
  else if (c.source === 'gsc_gap' || c.source === 'gsc_lowctr') h = 1.05 // 실제 검색 갭
  else if (c.source === 'community') h = 1.0
  if ((c.impressions ?? 0) > 0) h += 0.1 // 실검색 노출 = 수요 실증
  if (words >= 5) h += 0.2
  else if (words <= 2) h -= 0.25
  if (/(방법|서비스|추천|리스트|가격|뜻|비용|종류)$/.test(topic) && words <= 3) h -= 0.15 // 뻔한 헤드텀
  return clamp(h, 0.3, 1.4)
}

export function winnability(c: Pick<IdeaCandidate, 'topic'>): number {
  const topic = stripPrefix(c.topic)
  const words = topic.trim().split(/\s+/).length
  let w = 0.8
  if (words >= 4) w = 1.15
  else if (words === 3) w = 0.95
  else if (words <= 2) w = 0.42
  if (/^미국\s+\S+$/.test(topic)) w = Math.min(w, 0.42) // "미국 렌트"·"미국 쇼핑" 초광역
  return w
}

export interface RankBreakdown {
  demand: number
  rpm: number
  hook: number
  winnable: number
  final: number
}
export interface RankedCandidate extends IdeaCandidate {
  rank: RankBreakdown
}

export function rankCandidates(cands: IdeaCandidate[]): RankedCandidate[] {
  return cands
    .map((c) => {
      const demand = c.score ?? 0
      const rpm = rpmTier(c)
      const hook = hookScore(c)
      const winnable = winnability(c)
      const final = Math.round(demand * rpm * hook * winnable * 10) / 10
      return { ...c, rank: { demand, rpm, hook, winnable, final } }
    })
    .sort((a, b) => b.rank.final - a.rank.final)
}
