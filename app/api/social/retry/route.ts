export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { retryThreadsPost } from '@/lib/social/threads'

// 실패/멈춘 스레드 게시 재시도. 어드민 전용.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const postId = typeof body.post_id === 'string' ? body.post_id : ''
    if (!postId) return NextResponse.json({ error: 'post_id 필수' }, { status: 400 })

    const result = await retryThreadsPost(postId)
    return NextResponse.json(result) // 성공/실패는 result.ok로 판단, HTTP는 200
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
