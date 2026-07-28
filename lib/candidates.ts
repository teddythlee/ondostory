// idea_candidates 읽기·채택·기각.
//
// 채택하면 골격(outline)을 만들어 post_ideas에 넣는다 = 기존 초안 파이프라인에 합류.
// 여기서 글을 쓰지는 않는다 — 정직성 규칙상 경험은 사람이 채워야 한다(outline.ts 주석 참고).

import { supabaseAdmin } from './supabase'
import { createIdea } from './ideas'
import { buildOutline, type RelatedPost } from './discovery/outline'
import type { IdeaCandidate, CandidateStatus, DiscoveryRun } from './discovery/types'

export type { IdeaCandidate, CandidateStatus, DiscoveryRun }

export async function getCandidates(status: CandidateStatus = 'new', limit = 100): Promise<IdeaCandidate[]> {
  const { data, error } = await supabaseAdmin
    .from('idea_candidates')
    .select('*')
    .eq('status', status)
    .order('score', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as IdeaCandidate[]
}

export async function getRecentRuns(limit = 7): Promise<DiscoveryRun[]> {
  const { data, error } = await supabaseAdmin
    .from('idea_discovery_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as DiscoveryRun[]
}

/**
 * 후보 채택 → 골격이 채워진 post_ideas 생성.
 * cluster를 넘기면 후보의 클러스터를 덮어쓴다(미분류 후보를 채택할 때 사용).
 */
export async function adoptCandidate(id: string, cluster?: string | null): Promise<{ ideaId: string }> {
  const { data: row, error } = await supabaseAdmin.from('idea_candidates').select('*').eq('id', id).single()
  if (error) throw error
  const candidate = row as IdeaCandidate
  if (candidate.status === 'adopted' && candidate.idea_id) return { ideaId: candidate.idea_id }

  const resolved: IdeaCandidate = { ...candidate, cluster: cluster !== undefined ? cluster : candidate.cluster }

  // 내부링크 후보로 쓸 같은 클러스터의 발행 글
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('title, slug, cluster')
    .eq('status', 'published')
    .eq('cluster', resolved.cluster ?? '')
    .limit(8)

  const { topic, bullets } = buildOutline(resolved, (posts || []) as RelatedPost[])
  const idea = await createIdea({ topic, bullets })

  const { error: updErr } = await supabaseAdmin
    .from('idea_candidates')
    .update({ status: 'adopted', idea_id: idea.id, cluster: resolved.cluster, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updErr) throw updErr

  return { ideaId: idea.id }
}

export async function dismissCandidate(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('idea_candidates')
    .update({ status: 'dismissed', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
