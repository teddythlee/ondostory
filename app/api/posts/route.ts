export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createPost, getAllPostsAdmin } from '@/lib/posts'
import { notifyGoogleIndexing, notifyGoogleSitemapPing } from '@/lib/google-indexing'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()
    const posts = await getAllPostsAdmin()
    return NextResponse.json(posts)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const post = await createPost(body)

    if (post.published) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
      const postUrl = `${siteUrl}/blog/${post.slug}`
      await notifyGoogleIndexing(postUrl, 'URL_UPDATED')
      await notifyGoogleSitemapPing(siteUrl)
    }

    return NextResponse.json(post)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
