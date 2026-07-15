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
}

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
}
