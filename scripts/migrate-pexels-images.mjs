import { createClient } from '@supabase/supabase-js'

const applyChanges = process.argv.includes('--apply')
const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PEXELS_API_KEY']
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`${name} is required`)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function extractImages(post) {
  const bodyImages = [...post.content.matchAll(/<img\b[^>]+src=["']([^"']+)/gi)]
    .map((match) => match[1].replaceAll('&amp;', '&'))
  return [...new Set([post.cover_image, ...bodyImages].filter(Boolean))]
}

function replaceUrl(content, oldUrl, newUrl) {
  return content
    .replaceAll(oldUrl, newUrl)
    .replaceAll(oldUrl.replaceAll('&', '&amp;'), newUrl.replaceAll('&', '&amp;'))
}

function extensionFor(contentType) {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('avif')) return 'avif'
  return 'jpg'
}

async function getPexelsMetadata(imageUrl) {
  const id = imageUrl.match(/\/photos\/(\d+)\//)?.[1]
  if (!id) throw new Error(`Pexels photo id not found: ${imageUrl}`)
  const response = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  })
  if (!response.ok) throw new Error(`Pexels metadata failed (${response.status}): ${id}`)
  const photo = await response.json()
  if (!photo.url || !photo.photographer) throw new Error(`Incomplete Pexels metadata: ${id}`)
  return { id, sourceUrl: photo.url, creator: photo.photographer }
}

const { data: posts, error: postsError } = await supabase
  .from('posts')
  .select('id,slug,title,cover_image,content')
  .eq('status', 'published')
if (postsError) throw postsError

const usages = new Map()
for (const post of posts || []) {
  for (const imageUrl of extractImages(post)) {
    if (!imageUrl.includes('images.pexels.com')) continue
    const bucket = usages.get(imageUrl) || []
    bucket.push(post)
    usages.set(imageUrl, bucket)
  }
}

const migrations = []
for (const [oldUrl, affectedPosts] of usages) {
  const metadata = await getPexelsMetadata(oldUrl)
  migrations.push({ oldUrl, affectedPosts, ...metadata })
}

console.log(JSON.stringify({
  mode: applyChanges ? 'apply' : 'dry-run',
  images: migrations.length,
  posts: new Set(migrations.flatMap((item) => item.affectedPosts.map((post) => post.id))).size,
  items: migrations.map((item) => ({
    id: item.id,
    creator: item.creator,
    sourceUrl: item.sourceUrl,
    slugs: item.affectedPosts.map((post) => post.slug),
  })),
}, null, 2))

if (!applyChanges) process.exit(0)

const replacements = new Map()
for (const item of migrations) {
  const response = await fetch(item.oldUrl)
  if (!response.ok) throw new Error(`Image download failed (${response.status}): ${item.id}`)
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) throw new Error(`Unexpected content type (${contentType}): ${item.id}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > 15_000_000) throw new Error(`Unexpected image size (${bytes.byteLength}): ${item.id}`)

  const storagePath = `licensed/pexels-${item.id}.${extensionFor(contentType)}`
  const { error: uploadError } = await supabase.storage
    .from('blog-images')
    .upload(storagePath, bytes, { contentType, cacheControl: '31536000', upsert: true })
  if (uploadError) throw uploadError

  const { data: publicData } = supabase.storage.from('blog-images').getPublicUrl(storagePath)
  const newUrl = publicData.publicUrl
  const now = new Date().toISOString()
  const provenance = {
    origin_type: 'licensed_stock',
    rights_status: 'verified',
    source_url: item.sourceUrl,
    creator: item.creator,
    license_name: 'Pexels License',
    verification_note: `Pexels API metadata verified and self-hosted ${now.slice(0, 10)}`,
    verified_at: now,
    last_seen_at: now,
    updated_at: now,
  }
  const { error: newAssetError } = await supabase.from('image_assets').upsert({
    image_url: newUrl,
    host: new URL(newUrl).hostname,
    storage_path: storagePath,
    ...provenance,
  }, { onConflict: 'image_url' })
  if (newAssetError) throw newAssetError

  const { error: oldAssetError } = await supabase.from('image_assets').update({
    ...provenance,
    verification_note: `${provenance.verification_note}; migrated to ${storagePath}`,
  }).eq('image_url', item.oldUrl)
  if (oldAssetError) throw oldAssetError
  replacements.set(item.oldUrl, newUrl)
}

for (const post of posts || []) {
  let coverImage = post.cover_image
  let content = post.content
  for (const [oldUrl, newUrl] of replacements) {
    if (coverImage === oldUrl) coverImage = newUrl
    content = replaceUrl(content, oldUrl, newUrl)
  }
  if (coverImage === post.cover_image && content === post.content) continue
  const { error: updateError } = await supabase.from('posts').update({
    cover_image: coverImage,
    content,
  }).eq('id', post.id)
  if (updateError) throw updateError
}

console.log(`Migrated ${replacements.size} Pexels images to Supabase Storage.`)
