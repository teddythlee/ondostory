import type { PostMeta } from '@/types'

export const GUIDE_PHASES = [
  { key: 'start', eyebrow: '1단계', title: '먼저 읽기', description: '전체 흐름과 기준부터 잡아보세요.' },
  { key: 'prepare', eyebrow: '2단계', title: '준비하기', description: '서류·비용·선택지를 미리 확인합니다.' },
  { key: 'action', eyebrow: '3단계', title: '직접 해결하기', description: '실제 후기와 방법을 상황에 맞게 적용합니다.' },
  { key: 'check', eyebrow: '4단계', title: '비용과 실수 점검', description: '놓치기 쉬운 조건과 추가 비용을 점검합니다.' },
] as const

export type GuidePhaseKey = (typeof GUIDE_PHASES)[number]['key']

function stableHash(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return hash
}

export function getGuidePhase(post: PostMeta): GuidePhaseKey {
  const text = `${post.title} ${post.tags.join(' ')}`

  if (/총정리|처음|입학|가이드|장단점|비교/.test(text)) return 'start'
  if (/준비|서류|계좌|개통|보험|고르기|선택|예약|신청/.test(text)) return 'prepare'
  if (/비용|폭탄|함정|주의|낮추|피하|관세|정산|갱신|주소 변경/.test(text)) return 'check'
  return 'action'
}

/** 가이드가 날짜순 보관함이 되지 않도록, 정보 탐색 단계와 독자 검증(조회수)을 함께 사용한다. */
export function orderGuidePosts(posts: PostMeta[]): PostMeta[] {
  const phaseIndex = new Map(GUIDE_PHASES.map((phase, index) => [phase.key, index]))

  return [...posts].sort((a, b) => {
    const phaseDiff = (phaseIndex.get(getGuidePhase(a)) ?? 0) - (phaseIndex.get(getGuidePhase(b)) ?? 0)
    if (phaseDiff !== 0) return phaseDiff
    if (b.view_count !== a.view_count) return b.view_count - a.view_count
    return a.title.localeCompare(b.title, 'ko')
  })
}

function sharedTagCount(a: PostMeta, b: PostMeta): number {
  const tags = new Set(a.tags)
  return b.tags.reduce((count, tag) => count + (tags.has(tag) ? 1 : 0), 0)
}

/**
 * 같은 가이드의 다음 단계 글을 우선하고, 태그·카테고리·조회수로 동률을 해소한다.
 * 무작위 보충은 사용하지 않아 독자와 검색엔진 모두 매번 같은 문맥 연결을 본다.
 */
export function getRelatedPosts(current: PostMeta, all: PostMeta[], limit = 3): PostMeta[] {
  const others = all.filter((post) => post.id !== current.id)
  if (others.length === 0) return []

  const sameCluster = current.cluster
    ? orderGuidePosts(others.filter((post) => post.cluster === current.cluster))
    : []
  const currentIndex = current.cluster
    ? orderGuidePosts(all.filter((post) => post.cluster === current.cluster)).findIndex((post) => post.id === current.id)
    : -1

  const sequenceScore = new Map<string, number>()
  if (sameCluster.length > 0) {
    const orderedWithCurrent = orderGuidePosts(all.filter((post) => post.cluster === current.cluster))
    for (let offset = 1; offset < orderedWithCurrent.length; offset++) {
      const candidate = orderedWithCurrent[(currentIndex + offset) % orderedWithCurrent.length]
      if (candidate.id !== current.id) sequenceScore.set(candidate.id, orderedWithCurrent.length - offset)
    }
  }

  return others
    .map((post) => {
      const tagMatches = sharedTagCount(current, post)
      const score =
        (current.cluster && post.cluster === current.cluster ? 1000 : 0) +
        (sequenceScore.get(post.id) ?? 0) * 25 +
        tagMatches * 120 +
        (current.category && post.category === current.category ? 40 : 0) +
        Math.min(post.view_count, 250) / 10

      return { post, score, tieBreaker: stableHash(`${current.slug}:${post.slug}`) }
    })
    .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker)
    .slice(0, limit)
    .map(({ post }) => post)
}

export function getRecommendationReason(current: PostMeta, target: PostMeta): string {
  if (current.cluster && current.cluster === target.cluster) {
    const currentPhase = getGuidePhase(current)
    const targetPhase = GUIDE_PHASES.find((phase) => phase.key === getGuidePhase(target))
    if (currentPhase !== getGuidePhase(target) && targetPhase) return `${targetPhase.title} 단계로 이어집니다`
    return '같은 주제의 실제 경험을 이어서 확인하세요'
  }
  if (sharedTagCount(current, target) > 0) return '지금 읽은 내용과 함께 많이 찾는 정보입니다'
  return '온도스토리에서 많이 읽는 실전 정보입니다'
}
