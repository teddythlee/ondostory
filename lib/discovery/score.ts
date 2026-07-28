// 후보 점수 매기기.
//
// score = 수요 × 소스 신뢰도 × 클러스터 가중치 × 순위 보너스
//
// 핵심은 클러스터 가중치다. 같은 노출수라도 렌트·이사(글이 적고 단가 높음)가
// 여행(글이 많고 단가 낮음)보다 위로 올라와야 배분 계획대로 굴러간다.

import { clusterWeight } from './plan'
import type { RawCandidate, ScoredCandidate, CandidateSource } from './types'

const SOURCE_WEIGHT: Record<CandidateSource, number> = {
  gsc_gap: 1.5, // 내 사이트 실측 — 가장 확실
  gsc_lowctr: 1.3, // 역시 실측이고, 새 글보다 회수 비용이 싸다
  naver: 1.15, // 독자가 실제로 검색하는 한국어·네이버 신호 — 방향이 가장 맞는 외부 수요
  internal_gap: 1.1, // 구조적으로 항상 옳지만 수요 신호는 없음
  suggest: 1.0, // 구글 자동완성 — 무난하지만 영어·글로벌 섞임
  community: 0.85, // 영어권 신호라 한국어 검색량과 어긋날 수 있음
}

/** 소스마다 단위가 달라서(노출수·자동완성 순위·댓글 수) 0~1대로 정규화한다. */
function normalizeDemand(source: CandidateSource, demand: number): number {
  switch (source) {
    case 'gsc_gap':
    case 'gsc_lowctr':
      // 노출 10회 → 0.33, 100회 → 0.67, 1000회 → 1.0
      return Math.min(1.2, Math.log10(demand + 1) / 3)
    case 'suggest':
    case 'naver':
      return Math.min(1, demand / 10)
    case 'community':
      return Math.min(1, Math.log10(demand + 1) / 2.5)
    case 'internal_gap':
      return 0.6
  }
}

/** 8~12위는 한 계단만 밀면 1페이지 — 여기에 손대는 게 가장 남는다. */
function positionBonus(position?: number): number {
  if (position == null) return 1
  if (position >= 8 && position < 12) return 1.3
  if (position >= 12 && position < 16) return 1.15
  return 1
}

export function normalizeKey(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^가-힣a-z0-9]/g, '')
    .slice(0, 80)
}

function kindOf(c: RawCandidate): string {
  if (c.source === 'gsc_lowctr') return 'rewrite'
  if (c.source === 'gsc_gap' && c.evidence?.hasOwnPost) return 'boost'
  return 'new'
}

export function scoreCandidate(c: RawCandidate, publishedByCluster: Record<string, number>): ScoredCandidate {
  const raw =
    normalizeDemand(c.source, c.demand) *
    SOURCE_WEIGHT[c.source] *
    clusterWeight(c.cluster, c.cluster ? publishedByCluster[c.cluster] || 0 : 0) *
    positionBonus(c.position)

  return {
    ...c,
    score: Math.round(raw * 1000) / 10, // 대략 0~200 범위의 읽기 쉬운 수
    dedupKey: `${kindOf(c)}:${normalizeKey(c.query ?? c.topic)}`,
  }
}
