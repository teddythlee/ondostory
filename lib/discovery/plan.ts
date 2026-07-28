// 클러스터 성장 계획 — 발굴 우선순위의 기준선.
//
// 근거(2026-07 관리자 통계, 42건 / 누적 조회 1,464):
//   글당 조회수가 클러스터마다 2.3배 벌어져 있고, 글이 가장 많은 두 곳(맛집 10 · 여행 9)이
//   가장 효율이 낮았다. 반대로 렌트·이사(4건, 글당 56회)와 자녀교육(4건, 43회)은
//   글이 제일 적은데 효율이 제일 높다. 그래서 남은 발행분을 이쪽으로 몰아준다.
//
//   또 하나: 렌트·이사/정착 실무는 부동산·금융·이민 인접이라 애드센스 단가(RPM)가 높고
//   맛집·여행은 가장 낮은 구간이다. 유입 효율과 단가가 같은 방향을 가리킨다.
//
// target은 "100건 시점의 목표 글 수"다. 6클러스터를 유지하면 클러스터당 16.7건이 되어
// 토픽 권위 형성선(12~15건)을 넘긴다.

export interface ClusterPlan {
  /** 100건 시점 목표 글 수 */
  target: number
  /** 광고 단가 계수 — 1.0이 기준 */
  rpm: number
  /** 자동완성·커뮤니티 검색에 쓸 시드 키워드 */
  seeds: string[]
}

export const CLUSTER_PLAN: Record<string, ClusterPlan> = {
  housing: {
    target: 18,
    rpm: 1.25,
    seeds: ['미국 렌트', '미국 아파트 렌트', '미국 이사', '얼바인 렌트', '디파짓 정산', '미국 하우스 렌트'],
  },
  kids: {
    target: 18,
    rpm: 1.1,
    seeds: ['미국 초등학교', '미국 중학교 편입', '미국 학군', '미국 학원', '백투스쿨 준비물', '미국 고등학교'],
  },
  settlement: {
    target: 22,
    rpm: 1.3,
    seeds: ['미국 정착', '미국 은행 계좌', '미국 신용점수', '캘리포니아 DMV', '영주권 문호', '미국 이민 서류'],
  },
  shopping: {
    target: 12,
    rpm: 1.0,
    seeds: ['미국 쇼핑', '코스트코 추천', '미국 중고거래', '사우스코스트플라자', '미국 생활용품'],
  },
  food: {
    target: 16,
    rpm: 0.8,
    seeds: ['얼바인 맛집', '오렌지카운티 한인 맛집', '미국 집밥', 'LA 한인타운 맛집'],
  },
  travel: {
    target: 14,
    rpm: 0.8,
    seeds: ['캘리포니아 여행', '남가주 나들이', '오렌지카운티 가볼만한곳', '국립공원 여행'],
  },
}

/** 계획에 없는 클러스터(신설 등)를 위한 기본값 */
export const DEFAULT_PLAN: ClusterPlan = { target: 12, rpm: 1.0, seeds: [] }

export function planFor(cluster: string | null): ClusterPlan {
  if (!cluster) return DEFAULT_PLAN
  return CLUSTER_PLAN[cluster] ?? DEFAULT_PLAN
}

/**
 * 클러스터 가중치 = (부족분 0~1 → 0.6~1.6) × 단가 계수.
 * 목표를 이미 채운 클러스터는 0.6배로 내려가 자연히 뒤로 밀린다.
 */
export function clusterWeight(cluster: string | null, publishedCount: number): number {
  const plan = planFor(cluster)
  const deficit = Math.max(0, Math.min(1, (plan.target - publishedCount) / plan.target))
  return (0.6 + deficit) * plan.rpm
}
