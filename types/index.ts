export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  tags: string[]
  meta_title: string | null
  meta_description: string | null
  category: string | null
  view_count: number
}

export interface CreatePostInput {
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image?: string
  published: boolean
  tags: string[]
  meta_title?: string
  meta_description?: string
  category?: string | null
}
