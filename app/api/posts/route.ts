export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createPost, getAllPostsAdmin } from '@/lib/posts'
import { notifyIndexNow } from '@/lib/google-indexing'
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

    if (post.status === 'published') {
      // 저장 즉시 캐시 갱신 → 재배포 없이 바로 반영(ISR 대기 X). 재배포는 콘텐츠엔 불필요.
      revalidatePath(`/blog/${post.slug}`)
      revalidatePath('/blog')
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
      const postUrl = `${siteUrl}/blog/${post.slug}`
      await notifyIndexNow(postUrl)
    }

    return NextResponse.json(post)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
