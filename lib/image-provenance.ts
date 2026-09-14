import type { Post } from '@/types'
import { supabaseAdmin } from './supabase'

export type ImageOrigin = 'unknown' | 'original' | 'licensed_stock' | 'ai_generated' | 'business_provided'
export type ImageRightsStatus = 'unverified' | 'verified' | 'rejected'

export interface ImageAsset {
  image_url: string
  host: string
  storage_path: string | null
  origin_type: ImageOrigin
  rights_status: ImageRightsStatus
  source_url: string | null
  creator: string | null
  license_name: string | null
  verification_note: string
  first_seen_at: string
  last_seen_at: string
  verified_at: string | null
  updated_at: string
}

export interface ImageUsage {
  post_id: string
  image_url: string
  placement: 'cover' | 'body'
  alt_text: string
}

export interface ImageAuditItem extends ImageAsset {
  posts: Array<{ id: string; slug: string; title: string }>
  placements: Array<'cover' | 'body'>
}

function urlParts(imageUrl: string): { host: string; storagePath: string | null } {
  try {
    const url = new URL(imageUrl)
    const marker = '/storage/v1/object/public/blog-images/'
    return {
      host: url.hostname,
      storagePath: url.pathname.includes(marker) ? decodeURIComponent(url.pathname.split(marker)[1]) : null,
    }
  } catch {
    return { host: 'invalid', storagePath: null }
  }
}

export function extractImageUsages(post: Post): ImageUsage[] {
  const usages: ImageUsage[] = []
  if (post.cover_image) usages.push({ post_id: post.id, image_url: post.cover_image, placement: 'cover', alt_text: post.title })
  const imagePattern = /<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi
  for (const match of post.content.matchAll(imagePattern)) {
    const alt = match[0].match(/\balt=["']([^"']*)["']/i)?.[1] || ''
    usages.push({ post_id: post.id, image_url: match[1].replace(/&amp;/g, '&'), placement: 'body', alt_text: alt })
  }
  return [...new Map(usages.map((usage) => [`${usage.post_id}:${usage.placement}:${usage.image_url}`, usage])).values()]
}

export async function syncImageInventory(posts: Post[]): Promise<Record<string, ImageAsset>> {
  const seenAt = new Date().toISOString()
  const usages = posts.flatMap(extractImageUsages)
  const urls = [...new Set(usages.map((usage) => usage.image_url))]
  if (urls.length === 0) return {}

  const assets = urls.map((imageUrl) => {
    const { host, storagePath } = urlParts(imageUrl)
    return { image_url: imageUrl, host, storage_path: storagePath, last_seen_at: seenAt }
  })
  const { error: assetError } = await supabaseAdmin.from('image_assets').upsert(assets, { onConflict: 'image_url' })
  if (assetError) throw assetError

  const usageRows = usages.map((usage) => ({ ...usage, last_seen_at: seenAt }))
  const { error: usageError } = await supabaseAdmin.from('post_image_usages').upsert(usageRows, { onConflict: 'post_id,image_url,placement' })
  if (usageError) throw usageError

  const postIds = posts.map((post) => post.id)
  if (postIds.length > 0) {
    const { error: staleError } = await supabaseAdmin
      .from('post_image_usages')
      .delete()
      .in('post_id', postIds)
      .lt('last_seen_at', seenAt)
    if (staleError) throw staleError
  }

  const { data, error } = await supabaseAdmin.from('image_assets').select('*').in('image_url', urls)
  if (error) throw error
  return Object.fromEntries(((data || []) as ImageAsset[]).map((asset) => [asset.image_url, asset]))
}

export async function getImageAudit(): Promise<ImageAuditItem[]> {
  const [{ data: assets, error: assetsError }, { data: usages, error: usagesError }, { data: posts, error: postsError }] = await Promise.all([
    supabaseAdmin.from('image_assets').select('*').order('rights_status').order('last_seen_at', { ascending: false }),
    supabaseAdmin.from('post_image_usages').select('post_id,image_url,placement'),
    supabaseAdmin.from('posts').select('id,slug,title'),
  ])
  if (assetsError) throw assetsError
  if (usagesError) throw usagesError
  if (postsError) throw postsError

  const postMap = new Map((posts || []).map((post) => [post.id, post]))
  const usageMap = new Map<string, { posts: Map<string, { id: string; slug: string; title: string }>; placements: Set<'cover' | 'body'> }>()
  for (const usage of usages || []) {
    const bucket = usageMap.get(usage.image_url) || { posts: new Map(), placements: new Set<'cover' | 'body'>() }
    const post = postMap.get(usage.post_id)
    if (post) bucket.posts.set(post.id, post)
    bucket.placements.add(usage.placement as 'cover' | 'body')
    usageMap.set(usage.image_url, bucket)
  }

  return ((assets || []) as ImageAsset[]).map((asset) => {
    const usage = usageMap.get(asset.image_url)
    return { ...asset, posts: [...(usage?.posts.values() || [])], placements: [...(usage?.placements || [])] }
  })
}

export async function updateImageAsset(
  imageUrl: string,
  input: Pick<ImageAsset, 'origin_type' | 'rights_status'> & Partial<Pick<ImageAsset, 'source_url' | 'creator' | 'license_name' | 'verification_note'>>,
): Promise<ImageAsset> {
  const sourceUrl = input.source_url?.trim() || null
  const creator = input.creator?.trim() || null
  const licenseName = input.license_name?.trim() || null
  const note = input.verification_note?.trim() || ''
  if (input.rights_status === 'verified') {
    if (input.origin_type === 'unknown') throw new Error('검증 완료에는 이미지 유형이 필요합니다.')
    if (input.origin_type === 'original' && !creator) throw new Error('직접 촬영 이미지는 촬영자 이름이 필요합니다.')
    if (['licensed_stock', 'business_provided'].includes(input.origin_type) && !sourceUrl) throw new Error('외부 제공 이미지는 원본 페이지 URL이 필요합니다.')
    if (input.origin_type === 'ai_generated' && !note) throw new Error('AI 생성 이미지는 생성 도구·작성 기록을 메모에 남겨야 합니다.')
  }
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('image_assets')
    .update({
      origin_type: input.origin_type,
      rights_status: input.rights_status,
      source_url: sourceUrl,
      creator,
      license_name: licenseName,
      verification_note: note,
      verified_at: input.rights_status === 'verified' ? now : null,
      updated_at: now,
    })
    .eq('image_url', imageUrl)
    .select('*')
    .single()
  if (error || !data) throw error || new Error('이미지 출처 정보를 저장하지 못했습니다.')
  return data as ImageAsset
}

export async function registerLicensedImage(asset: {
  imageUrl: string
  sourceUrl: string
  creator: string
  licenseName: string
}) {
  const { host, storagePath } = urlParts(asset.imageUrl)
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from('image_assets').upsert({
    image_url: asset.imageUrl,
    host,
    storage_path: storagePath,
    origin_type: 'licensed_stock',
    rights_status: 'verified',
    source_url: asset.sourceUrl,
    creator: asset.creator,
    license_name: asset.licenseName,
    verification_note: '관리자 이미지 검색에서 라이선스 정보와 함께 삽입',
    verified_at: now,
    last_seen_at: now,
    updated_at: now,
  }, { onConflict: 'image_url' })
  if (error) throw error
}

export async function registerUploadedImage(imageUrl: string) {
  const { host, storagePath } = urlParts(imageUrl)
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from('image_assets').upsert({
    image_url: imageUrl,
    host,
    storage_path: storagePath,
    last_seen_at: now,
    updated_at: now,
  }, { onConflict: 'image_url' })
  if (error) throw error
}
