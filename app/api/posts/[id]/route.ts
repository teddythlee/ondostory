export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { updatePost, deletePost } from '@/lib/posts'
import { notifyGoogleIndexing, notifyGoogleSitemapPing, notifyIndexNow } from '@/lib/google-indexing'
import { pushToThreads } from '@/lib/social/threads'
import { requireAdmin } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const post = await updatePost(id, body)

    // 저장 즉시 그 페이지+목록 캐시 갱신 → 재배포 없이 바로 반영(ISR 10분 대기 X).
    // 콘텐츠 수정엔 재배포가 필요 없다(재배포는 캐시를 식혀 첫 렌더 실패를 유발).
    revalidatePath(`/blog/${post.slug}`)
    revalidatePath('/blog')

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
    const postUrl = `${siteUrl}/blog/${post.slug}`

    if (post.status === 'published') {
      await notifyGoogleIndexing(postUrl, 'URL_UPDATED')
      await notifyIndexNow(postUrl)
      await notifyGoogleSitemapPing(siteUrl)
      // 스레드 게시(Buffer). 내부에서 예외를 삼켜 발행을 블로킹하지 않는다.
      // 재편집(published→published)에도 unique(post_id, platform)로 중복 게시가 막힌다.
      await pushToThreads(post)
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

    if (post?.status === 'published') {
      revalidatePath(`/blog/${post.slug}`)
      revalidatePath('/blog')
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
