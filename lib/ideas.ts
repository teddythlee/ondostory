import { supabaseAdmin } from './supabase'

export type IdeaStatus = 'pending' | 'processing' | 'done' | 'skipped'

export interface PostIdea {
  id: string
  topic: string
  bullets: string
  image_urls: string[]
  status: IdeaStatus
  post_id: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface CreateIdeaInput {
  topic: string
  bullets: string
  image_urls?: string[]
}

export async function getIdeas(): Promise<PostIdea[]> {
  const { data, error } = await supabaseAdmin
    .from('post_ideas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createIdea(input: CreateIdeaInput): Promise<PostIdea> {
  const { data, error } = await supabaseAdmin
    .from('post_ideas')
    .insert({ topic: input.topic, bullets: input.bullets, image_urls: input.image_urls ?? [] })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateIdea(id: string, input: CreateIdeaInput): Promise<PostIdea> {
  const { data, error } = await supabaseAdmin
    .from('post_ideas')
    .update({ topic: input.topic, bullets: input.bullets, image_urls: input.image_urls ?? [], updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('post_ideas').delete().eq('id', id)
  if (error) throw error
}

export async function updateIdeaStatus(
  id: string,
  status: IdeaStatus,
  postId?: string | null,
  note?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (postId !== undefined) updates.post_id = postId
  if (note !== undefined) updates.note = note
  const { error } = await supabaseAdmin.from('post_ideas').update(updates).eq('id', id)
  if (error) throw error
}
