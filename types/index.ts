export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived'

export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  status: PostStatus
  /** Derived shadow of `status` (status='published'). Kept in sync by DB trigger; will be dropped once fully migrated. */
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  tags: string[]
  meta_title: string | null
  meta_description: string | null
  category: string | null
  cluster: string | null
  view_count: number
  /** 공백·HTML 제거 후 글자 수 (DB 생성 컬럼). 목록·에디터 글자수 표시용. */
  content_chars: number
  /** 스레드 게시용 훅(3줄). 발행 시 Buffer로 이 텍스트+링크가 나간다. null이면 게시 안 함. */
  social_hook: string | null
}

/**
 * 본문(content)을 뺀 Post. 목록·사이트맵·관련글·관리자 테이블·통계처럼
 * 본문을 렌더하지 않는 화면에서 사용한다. content는 글당 수십 KB라
 * 전체 글을 통째로 읽으면 전송량·메모리가 폭증하기 때문이다.
 */
export type PostMeta = Omit<Post, 'content'>

export interface Cluster {
  id: string
  key: string
  emoji: string
  title: string
  nav_label: string
  tagline: string
  meta_description: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ClusterInput {
  key: string
  emoji?: string
  title: string
  nav_label?: string
  tagline?: string
  meta_description?: string
  sort_order?: number
}

export interface CreatePostInput {
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image?: string
  status: PostStatus
  tags: string[]
  meta_title?: string
  meta_description?: string
  category?: string | null
  cluster?: string | null
  social_hook?: string | null
}
