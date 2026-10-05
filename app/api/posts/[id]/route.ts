export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { updatePost, deletePost } from '@/lib/posts'
import { notifyIndexNow } from '@/lib/google-indexing'
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
      await notifyIndexNow(postUrl)
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
      await notifyIndexNow(`${siteUrl}/blog/${post.slug}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
