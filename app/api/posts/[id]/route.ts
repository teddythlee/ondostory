export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { updatePost, deletePost } from '@/lib/posts'
import { notifyGoogleIndexing, notifyGoogleSitemapPing, notifyIndexNow } from '@/lib/google-indexing'
import { requireAdmin } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const post = await updatePost(id, body)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
    const postUrl = `${siteUrl}/blog/${post.slug}`

    if (post.published) {
      await notifyGoogleIndexing(postUrl, 'URL_UPDATED')
      await notifyIndexNow(postUrl)
      await notifyGoogleSitemapPing(siteUrl)
    }

    return NextResponse.json(post)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params

    // Get post before deletion for Google notification
    const { getPostByIdAdmin } = await import('@/lib/posts')
    const post = await getPostByIdAdmin(id)

    await deletePost(id)

    if (post?.published) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
      await notifyGoogleIndexing(`${siteUrl}/blog/${post.slug}`, 'URL_DELETED')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
