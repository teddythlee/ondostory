export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { updateIdea, deleteIdea, updateIdeaStatus, type IdeaStatus } from '@/lib/ideas'
import { requireAdmin } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    // 상태만 변경(보류/되돌리기) — topic 없이 status만 오는 요청
    if (body.status !== undefined && body.topic === undefined) {
      const valid: IdeaStatus[] = ['pending', 'processing', 'done', 'skipped']
      if (!valid.includes(body.status)) {
        return NextResponse.json({ error: '잘못된 상태' }, { status: 400 })
      }
      await updateIdeaStatus(id, body.status)
      return NextResponse.json({ ok: true, status: body.status })
    }
    if (!body.topic?.trim()) {
      return NextResponse.json({ error: '주제를 입력하세요' }, { status: 400 })
    }
    const idea = await updateIdea(id, {
      topic: body.topic.trim(),
      bullets: (body.bullets || '').trim(),
      image_urls: Array.isArray(body.image_urls) ? body.image_urls : [],
    })
    return NextResponse.json(idea)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params
    await deleteIdea(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
