import { supabase, supabaseAdmin } from './supabase'
import type { Post, PostMeta, CreatePostInput } from '@/types'

const PAGE_SLUGS = ['about', 'contact', 'privacy-policy', 'terms', 'disclaimer']

// 목록·사이트맵·관련글·통계·관리자 테이블은 본문(content)이 필요 없다.
// content는 글 하나가 수십 KB라, 전체 글을 select('*')로 통째로 읽으면 전송량·메모리가
// 폭증한다(35개 코퍼스를 매번 다 읽던 게 과부하의 원인). posts 컬럼에서 content만 뺀 목록.
const POST_META_COLUMNS =
  'id,title,slug,excerpt,cover_image,published,published_at,created_at,updated_at,tags,meta_title,meta_description,category,view_count,cluster,status,content_chars'

export async function getPublishedPosts(): Promise<PostMeta[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_META_COLUMNS)
    .eq('status', 'published')
    .not('slug', 'in', `(${PAGE_SLUGS.join(',')})`)
    .order('published_at', { ascending: false })

  if (error) throw error
  return data || []
}

// RSS 피드만 본문 전문(content:encoded)이 필요하다. 봇이 자주 폴링하는 엔드포인트라
// 전체를 읽지 않도록 DB에서 최신 N개로 제한해 읽는다.
export async function getRecentPublishedWithContent(limit = 50): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .not('slug', 'in', `(${PAGE_SLUGS.join(',')})`)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getPostsByCluster(cluster: string): Promise<PostMeta[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_META_COLUMNS)
    .eq('status', 'published')
    .eq('cluster', cluster)
    .order('published_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) return null
  return data
}

export async function getAllPostsAdmin(): Promise<Post[]> {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .not('slug', 'in', `(${PAGE_SLUGS.join(',')})`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// 관리자 목록·통계 화면용: 본문 없이 메타만. (이 화면들은 content를 렌더하지 않는다.)
export async function getAllPostsAdminMeta(): Promise<PostMeta[]> {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select(POST_META_COLUMNS)
    .not('slug', 'in', `(${PAGE_SLUGS.join(',')})`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// 고정 페이지(About/Contact/Privacy 등)는 공개 목록·RSS에선 빠지지만 admin에선 편집돼야 한다.
// 아티클 목록과 섞지 않도록 별도로 반환한다.
export async function getPagesAdminMeta(): Promise<PostMeta[]> {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select(POST_META_COLUMNS)
    .in('slug', PAGE_SLUGS)
    .order('slug', { ascending: true })

  if (error) throw error
  return data || []
}

// 초안 검토 큐: 미발행 글만, 본문 포함(마커 개수를 세야 하므로). 발행글 본문은 읽지 않는다.
export async function getDraftsAdmin(): Promise<Post[]> {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .neq('status', 'published')
    .not('slug', 'in', `(${PAGE_SLUGS.join(',')})`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPostByIdAdmin(id: string): Promise<Post | null> {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      ...input,
      published_at: input.status === 'published' ? now : null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePost(id: string, input: Partial<CreatePostInput>): Promise<Post> {
  const updates: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() }

  const existing = await getPostByIdAdmin(id)

  // 발행(=색인)된 글의 슬러그는 변경 불가. 요청에 slug가 와도 무시한다(색인 보호, 프론트 잠금의 이중 방어).
  // 슬러그를 꼭 바꿔야 하면 next.config.ts에 308 리다이렉트를 걸고 DB에서 직접 변경한다.
  if (existing?.status === 'published' && 'slug' in updates) {
    delete updates.slug
  }

  // Set published_at when first published
  if (input.status === 'published' && existing && !existing.published_at) {
    updates.published_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('posts').delete().eq('id', id)
  if (error) throw error
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[가-힣]/g, (char) => encodeURIComponent(char).replace(/%/g, '').toLowerCase())
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    || `post-${Date.now()}`
}
