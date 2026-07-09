import { supabase, supabaseAdmin } from './supabase'
import type { Cluster, ClusterInput } from '@/types'

// 토픽 클러스터(가이드 허브)는 DB(clusters 테이블)로 관리한다.
// 허브 페이지 · 가이드 인덱스 · 글 하단 복귀 링크 · sitemap이 모두 여기를 통해 읽는다.

export async function getClusters(): Promise<Cluster[]> {
  const { data, error } = await supabase
    .from('clusters')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getClusterByKey(key: string | null | undefined): Promise<Cluster | null> {
  if (!key) return null
  const { data, error } = await supabase
    .from('clusters')
    .select('*')
    .eq('key', key)
    .single()

  if (error) return null
  return data
}

// ── admin ──
export async function getClustersAdmin(): Promise<Cluster[]> {
  const { data, error } = await supabaseAdmin
    .from('clusters')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createCluster(input: ClusterInput): Promise<Cluster> {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('clusters')
    .insert({ ...input, created_at: now, updated_at: now })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCluster(id: string, input: Partial<ClusterInput>): Promise<Cluster> {
  const { data, error } = await supabaseAdmin
    .from('clusters')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCluster(id: string): Promise<void> {
  // posts.cluster는 FK(on delete set null)로 자동 정리된다.
  const { error } = await supabaseAdmin.from('clusters').delete().eq('id', id)
  if (error) throw error
}
