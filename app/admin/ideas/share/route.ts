export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'

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
  if (urls.length) target.searchParams.set('shared', urls.join(','))
  return NextResponse.redirect(target, 303)
}
