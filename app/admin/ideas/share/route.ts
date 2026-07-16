export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'
import { createIdea } from '@/lib/ideas'

// Web Share Target endpoint: receives photos shared from other apps
// (Google Photos → 공유 → ondostory), uploads them to blog storage, and
// redirects to the ideas form with the URLs pre-attached.
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/avif': 'avif',
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const urls: string[] = []
  try {
    const form = await req.formData()
    const files = form.getAll('photos').filter((f): f is File => f instanceof File)
    for (const file of files) {
      const ext = (file.name.includes('.') ? file.name.split('.').pop() : undefined) || MIME_EXT[file.type] || 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabaseAdmin.storage
        .from('blog-images')
        .upload(filename, file, { contentType: file.type, upsert: false })
      if (!error) {
        const { data } = supabaseAdmin.storage.from('blog-images').getPublicUrl(filename)
        urls.push(data.publicUrl)
      }
    }
  } catch {
    // fall through — redirect to the form regardless
  }

  const target = new URL('/admin/ideas', req.url)
  if (urls.length) {
    // Persist the shared photos as an idea IMMEDIATELY (placeholder topic), so
    // they show up in the list and survive even if the owner never fills in the
    // form. We then open that idea in edit mode to fill in the details.
    try {
      const idea = await createIdea({ topic: '📷 공유한 사진', bullets: '', image_urls: urls })
      target.searchParams.set('edit', idea.id)
    } catch {
      // Insert failed but the photos are uploaded — fall back to pre-filling the
      // form so they're at least visible and can be saved manually.
      target.searchParams.set('shared', urls.join(','))
    }
  } else {
    // A bare redirect (no query) looks identical to "nothing happened" on the
    // phone, so signal the failure explicitly.
    target.searchParams.set('share', 'fail')
  }
  return NextResponse.redirect(target, 303)
}
