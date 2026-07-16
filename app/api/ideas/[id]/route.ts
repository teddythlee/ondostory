export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { updateIdea, deleteIdea } from '@/lib/ideas'
import { requireAdmin } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
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
