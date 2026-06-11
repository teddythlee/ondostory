import { supabase, supabaseAdmin } from './supabase'
import type { Post, CreatePostInput } from '@/types'

const PAGE_SLUGS = ['about', 'contact', 'privacy-policy', 'terms', 'disclaimer']

export async function getPublishedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .not('slug', 'in', `(${PAGE_SLUGS.join(',')})`)
    .order('published_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
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
      published_at: input.published ? now : null,
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

  // Set published_at when first published
  if (input.published) {
    const existing = await getPostByIdAdmin(id)
    if (existing && !existing.published_at) {
      updates.published_at = new Date().toISOString()
    }
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
