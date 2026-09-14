import { supabaseAdmin } from './supabase'
import { getAllPostsAdmin, getAllPostsAdminMeta } from './posts'
import { getGscPageMap } from './gsc'
import { getGa4PageMap } from './ga4'
import { evaluateContentQuality, type QualityFactor, type QualityRisk, type QualityReview } from './content-quality'
import type { Ga4PageMetrics } from './ga4'

export type QualityWorkState = 'queued' | 'improving' | 'monitoring' | 'resolved'

export interface QualityManualChecks {
  originalValue: boolean
  experienceEvidence: boolean
  factChecked: boolean
  intentComplete: boolean
}

export const EMPTY_MANUAL_CHECKS: QualityManualChecks = {
  originalValue: false,
  experienceEvidence: false,
  factChecked: false,
  intentComplete: false,
}

export interface StoredQualityReview {
  id: string
  run_id: string
  post_id: string
  slug_snapshot: string
  score: number
  risk_level: QualityRisk
  priority_score: number
  factors: QualityFactor[]
  recommendations: string[]
  metrics: QualityReview['metrics']
  content_fingerprint: string
  created_at: string
}

export interface QualityScanRun {
  id: string
  source: 'manual' | 'scheduled'
  started_at: string
  completed_at: string | null
  post_count: number
  critical_count: number
  watch_count: number
  healthy_count: number
  created_at: string
}

export interface QualityWorkItem {
  post_id: string
  state: QualityWorkState
  notes: string
  manual_checks: QualityManualChecks
  started_at: string | null
  resolved_at: string | null
  updated_at: string
}

export interface QualityDashboardRow extends StoredQualityReview {
  title: string
  current_slug: string
  updated_at: string
  content_chars: number
  cluster: string | null
  work: QualityWorkItem | null
  previous_score: number | null
  score_delta: number | null
}

export interface QualityDashboardData {
  latestRun: QualityScanRun | null
  previousRun: QualityScanRun | null
  rows: QualityDashboardRow[]
}

function reviewRecord(runId: string, review: QualityReview) {
  return {
    run_id: runId,
    post_id: review.postId,
    slug_snapshot: review.slug,
    score: review.score,
    risk_level: review.riskLevel,
    priority_score: review.priorityScore,
    factors: review.factors,
    recommendations: review.recommendations,
    metrics: review.metrics,
    content_fingerprint: review.contentFingerprint,
  }
}

export async function runQualityScan(source: 'manual' | 'scheduled'): Promise<QualityScanRun> {
  const { data: created, error: createError } = await supabaseAdmin
    .from('quality_scan_runs')
    .insert({ source })
    .select('*')
    .single()
  if (createError || !created) throw createError || new Error('품질 점검 실행을 만들지 못했습니다.')

  try {
    const [posts, gscBySlug, ga4BySlug] = await Promise.all([
      getAllPostsAdmin(),
      getGscPageMap().catch(() => ({})),
      getGa4PageMap().catch(() => ({} as Record<string, Ga4PageMetrics>)),
    ])
    const reviews = evaluateContentQuality(posts, gscBySlug, ga4BySlug)

    if (reviews.length > 0) {
      const { error: reviewError } = await supabaseAdmin
        .from('content_quality_reviews')
        .insert(reviews.map((review) => reviewRecord(created.id, review)))
      if (reviewError) throw reviewError

      const { error: workError } = await supabaseAdmin
        .from('quality_work_items')
        .upsert(
          // 자동 통과 글도 사람 검수를 마쳐야 해결할 수 있으므로 전체 글을 운영 큐에 둔다.
          reviews.map((review) => ({ post_id: review.postId, state: 'queued' })),
          { onConflict: 'post_id', ignoreDuplicates: true },
        )
      if (workError) throw workError
    }

    const summary = {
      completed_at: new Date().toISOString(),
      post_count: reviews.length,
      critical_count: reviews.filter((review) => review.riskLevel === 'critical').length,
      watch_count: reviews.filter((review) => review.riskLevel === 'watch').length,
      healthy_count: reviews.filter((review) => review.riskLevel === 'healthy').length,
    }
    const { data: completed, error: updateError } = await supabaseAdmin
      .from('quality_scan_runs')
      .update(summary)
      .eq('id', created.id)
      .select('*')
      .single()
    if (updateError || !completed) throw updateError || new Error('품질 점검 결과를 저장하지 못했습니다.')
    return completed as QualityScanRun
  } catch (error) {
    await supabaseAdmin.from('quality_scan_runs').delete().eq('id', created.id)
    throw error
  }
}

export async function getQualityDashboard(): Promise<QualityDashboardData> {
  const { data: runs, error: runsError } = await supabaseAdmin
    .from('quality_scan_runs')
    .select('*')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(2)
  if (runsError) throw runsError

  const latestRun = (runs?.[0] as QualityScanRun | undefined) || null
  const previousRun = (runs?.[1] as QualityScanRun | undefined) || null
  if (!latestRun) return { latestRun: null, previousRun: null, rows: [] }

  const [reviewsResult, previousResult, workResult, posts] = await Promise.all([
    supabaseAdmin.from('content_quality_reviews').select('*').eq('run_id', latestRun.id).order('priority_score', { ascending: false }),
    previousRun
      ? supabaseAdmin.from('content_quality_reviews').select('post_id,score').eq('run_id', previousRun.id)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin.from('quality_work_items').select('*'),
    getAllPostsAdminMeta(),
  ])
  if (reviewsResult.error) throw reviewsResult.error
  if (previousResult.error) throw previousResult.error
  if (workResult.error) throw workResult.error

  const postMap = new Map(posts.map((post) => [post.id, post]))
  const previousMap = new Map((previousResult.data || []).map((review) => [review.post_id, review.score]))
  const workMap = new Map((workResult.data || []).map((item) => [item.post_id, item as QualityWorkItem]))
  const rows = ((reviewsResult.data || []) as StoredQualityReview[]).flatMap((review) => {
    const post = postMap.get(review.post_id)
    if (!post) return []
    const previousScore = previousMap.get(review.post_id) ?? null
    return [{
      ...review,
      title: post.title,
      current_slug: post.slug,
      updated_at: post.updated_at,
      content_chars: post.content_chars,
      cluster: post.cluster,
      work: workMap.get(review.post_id) || null,
      previous_score: previousScore,
      score_delta: previousScore === null ? null : review.score - previousScore,
    }]
  })

  return { latestRun, previousRun, rows }
}

export async function updateQualityWorkItem(
  postId: string,
  input: { state: QualityWorkState; notes?: string; manualChecks?: QualityManualChecks },
): Promise<QualityWorkItem> {
  const now = new Date().toISOString()
  const manualChecks = input.manualChecks || EMPTY_MANUAL_CHECKS
  if (input.state === 'resolved' && Object.values(manualChecks).some((checked) => !checked)) {
    throw new Error('해결 처리하려면 네 가지 사람 검수를 모두 완료해야 합니다.')
  }
  const values = {
    post_id: postId,
    state: input.state,
    notes: input.notes ?? '',
    manual_checks: manualChecks,
    updated_at: now,
    started_at: input.state === 'improving' ? now : undefined,
    resolved_at: input.state === 'resolved' ? now : null,
  }
  const { data, error } = await supabaseAdmin
    .from('quality_work_items')
    .upsert(values, { onConflict: 'post_id' })
    .select('*')
    .single()
  if (error || !data) throw error || new Error('작업 상태를 저장하지 못했습니다.')
  return data as QualityWorkItem
}
