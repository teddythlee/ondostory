import type { Post } from '@/types'
import type { Ga4PageMetrics } from './ga4'

export type QualityRisk = 'critical' | 'watch' | 'healthy'

export interface SearchMetrics {
  impressions: number
  clicks: number
  position: number
}

export interface QualityFactor {
  key: string
  label: string
  penalty: number
  detail: string
}

export interface QualityReview {
  postId: string
  slug: string
  score: number
  riskLevel: QualityRisk
  priorityScore: number
  factors: QualityFactor[]
  recommendations: string[]
  metrics: {
    contentChars: number
    headingCount: number
    evidenceSignals: number
    specificitySignals: number
    genericPatternCount: number
    externalLinkCount: number
    imageCount: number
    maxSimilarity: number
    similarSlug: string | null
    daysSinceUpdate: number
    gsc: SearchMetrics | null
    ga4: Ga4PageMetrics | null
  }
  contentFingerprint: string
}

interface PreparedPost {
  post: Post
  text: string
  tokens: Set<string>
  headingCount: number
  evidenceSignals: number
  specificitySignals: number
  genericPatternCount: number
  externalLinkCount: number
  imageCount: number
  fingerprint: string
}

function plainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length
}

function tokenSet(text: string): Set<string> {
  return new Set(text
    .toLowerCase()
    .replace(/[^0-9a-z가-힣\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3))
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const item of a) if (b.has(item)) intersection++
  return intersection / (a.size + b.size - intersection)
}

function hashText(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function prepare(post: Post): PreparedPost {
  const text = plainText(post.content)
  return {
    post,
    text,
    tokens: tokenSet(text),
    headingCount: countMatches(post.content, /<h[2-4]\b/gi),
    evidenceSignals: countMatches(text, /직접|제가|저는|우리 가족|해봤|다녀|사용했|살아보|살았|겪었|결제했|방문했|신청했|구매했|먹어|타봤|받았|선택했/gi),
    specificitySignals: countMatches(text, /(?:\$|USD|달러|원|%|마일|분|시간|개월|년|월|일|번|개|명|시|[0-9][0-9,.]*)/gi),
    genericPatternCount: countMatches(text, /자주 묻는 질문|FAQ|결론적으로|정리하자면|마무리하며|도움이 되셨기를|상황에 따라 다를 수|전문가와 상담/gi),
    externalLinkCount: countMatches(post.content, /<a\b[^>]+href=["']https?:/gi),
    imageCount: countMatches(post.content, /<img\b/gi),
    fingerprint: hashText(text.toLowerCase().replace(/\s+/g, ' ')),
  }
}

function addFactor(factors: QualityFactor[], key: string, label: string, penalty: number, detail: string) {
  factors.push({ key, label, penalty, detail })
}

export function evaluateContentQuality(
  posts: Post[],
  gscBySlug: Record<string, SearchMetrics> = {},
  ga4BySlug: Record<string, Ga4PageMetrics> = {},
): QualityReview[] {
  const prepared = posts.filter((post) => post.status === 'published').map(prepare)

  return prepared.map((item) => {
    const { post } = item
    let maxSimilarity = 0
    let similarSlug: string | null = null
    for (const other of prepared) {
      if (other.post.id === post.id) continue
      const value = similarity(item.tokens, other.tokens)
      if (value > maxSimilarity) {
        maxSimilarity = value
        similarSlug = other.post.slug
      }
    }

    const factors: QualityFactor[] = []
    if (item.text.length < 1200) addFactor(factors, 'thin', '본문이 얇음', 24, `${item.text.length.toLocaleString()}자`)
    else if (item.text.length < 1800) addFactor(factors, 'short', '설명이 다소 짧음', 12, `${item.text.length.toLocaleString()}자`)

    if (item.evidenceSignals === 0) addFactor(factors, 'experience', '직접 경험 신호 부족', 25, '행동·선택·결과를 보여주는 1인칭 근거가 없습니다.')
    else if (item.evidenceSignals === 1) addFactor(factors, 'experience', '경험 근거가 약함', 15, '경험 표현 1개')
    else if (item.evidenceSignals < 3) addFactor(factors, 'experience', '경험 근거가 다소 약함', 8, `경험 표현 ${item.evidenceSignals}개`)

    const sourceExpected = /총정리|방법|가이드|법|규정|보험|입학|절차|비교|비용|관세|은행|비자|서류/i.test(`${post.title} ${post.tags.join(' ')}`)
    if (sourceExpected && item.externalLinkCount === 0 && item.evidenceSignals < 3) {
      addFactor(factors, 'sources', '근거 출처 확인 필요', 10, '정보형 글인데 외부 근거나 충분한 직접 경험이 보이지 않습니다.')
    }

    if (item.specificitySignals < 4) addFactor(factors, 'specificity', '구체적인 정보 부족', 16, '가격·기간·수치·조건 같은 실행 정보가 적습니다.')
    else if (item.specificitySignals < 8) addFactor(factors, 'specificity', '구체성이 다소 약함', 7, `구체 정보 신호 ${item.specificitySignals}개`)

    if (item.headingCount < 2 && item.text.length >= 1200) addFactor(factors, 'structure', '본문 구조 부족', 7, `소제목 ${item.headingCount}개`)
    if (item.genericPatternCount >= 3) addFactor(factors, 'template', '정형 문구 반복 위험', 10, `상투 문구 ${item.genericPatternCount}개`)
    else if (item.genericPatternCount > 0) addFactor(factors, 'template', '정형 문구 확인 필요', 4, `상투 문구 ${item.genericPatternCount}개`)

    if (maxSimilarity >= 0.1) addFactor(factors, 'duplicate', '다른 글과 어휘가 매우 유사함', 14, `${similarSlug}와 ${Math.round(maxSimilarity * 100)}% 유사`)
    else if (maxSimilarity >= 0.075) addFactor(factors, 'duplicate', '유사 문서 확인 필요', 7, `${similarSlug}와 ${Math.round(maxSimilarity * 100)}% 유사`)

    if (!post.meta_description?.trim()) addFactor(factors, 'meta', '메타 설명 없음', 5, '검색 결과 설명을 직접 작성하세요.')
    if (!post.cluster) addFactor(factors, 'cluster', '주제 연결 없음', 4, '관련 가이드에 연결되지 않았습니다.')

    const daysSinceUpdate = Math.max(0, Math.floor((Date.now() - new Date(post.updated_at || post.created_at).getTime()) / 86_400_000))
    const timeSensitive = /가격|비용|법|규정|보험|관세|입학|갱신|비자|은행|렌트|DMV/i.test(`${post.title} ${post.tags.join(' ')}`)
    if (timeSensitive && daysSinceUpdate > 365) addFactor(factors, 'stale', '최신성 점검 필요', 7, `마지막 수정 ${daysSinceUpdate}일 전`)

    const score = Math.max(0, Math.round(100 - factors.reduce((sum, factor) => sum + factor.penalty, 0)))
    const riskLevel: QualityRisk = score < 68 ? 'critical' : score < 83 ? 'watch' : 'healthy'
    const gsc = gscBySlug[post.slug] || null
    const ga4 = ga4BySlug[post.slug] || null

    // 품질 점수와 성과는 분리한다. 성과는 "어느 글부터 고칠지"에만 영향을 준다.
    let priorityScore = (100 - score) * 1.4
    if (gsc && gsc.impressions >= 50 && gsc.clicks / gsc.impressions < 0.03) priorityScore += 15
    else if (gsc && gsc.impressions >= 15 && gsc.clicks === 0) priorityScore += 9
    if (ga4 && ga4.sessions >= 5 && ga4.engagementRate < 0.45) priorityScore += 12
    if (daysSinceUpdate < 42) priorityScore -= 12
    priorityScore = Math.max(0, Math.round(priorityScore * 10) / 10)

    const recommendations = factors
      .sort((a, b) => b.penalty - a.penalty)
      .slice(0, 4)
      .map((factor) => {
        if (factor.key === 'thin') return '검색 의도에 직접 답하는 과정·조건·결과를 추가하세요.'
        if (factor.key === 'experience') return '직접 선택한 이유, 실제 진행 과정, 결과와 아쉬움을 추가하세요.'
        if (factor.key === 'specificity') return '가격·날짜·준비물·소요 시간·판단 기준을 구체적으로 적으세요.'
        if (factor.key === 'duplicate') return '유사 글과 역할을 나누고 이 글만의 경험과 결론으로 다시 구성하세요.'
        if (factor.key === 'template') return '상투적인 FAQ·결론 대신 이 주제에 필요한 구조로 바꾸세요.'
        if (factor.key === 'stale') return '현재 가격과 규정을 다시 확인하고 확인 날짜를 표시하세요.'
        if (factor.key === 'structure') return '독자의 행동 순서에 맞춘 소제목을 추가하세요.'
        return factor.detail
      })

    return {
      postId: post.id,
      slug: post.slug,
      score,
      riskLevel,
      priorityScore,
      factors,
      recommendations: [...new Set(recommendations)],
      metrics: {
        contentChars: item.text.length,
        headingCount: item.headingCount,
        evidenceSignals: item.evidenceSignals,
        specificitySignals: item.specificitySignals,
        genericPatternCount: item.genericPatternCount,
        externalLinkCount: item.externalLinkCount,
        imageCount: item.imageCount,
        maxSimilarity: Math.round(maxSimilarity * 1000) / 1000,
        similarSlug,
        daysSinceUpdate,
        gsc,
        ga4,
      },
      contentFingerprint: item.fingerprint,
    }
  }).sort((a, b) => b.priorityScore - a.priorityScore)
}
