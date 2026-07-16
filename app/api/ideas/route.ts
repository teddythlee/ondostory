export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createIdea, getIdeas } from '@/lib/ideas'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(await getIdeas())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    if (!body.topic?.trim()) {
      return NextResponse.json({ error: '주제를 입력하세요' }, { status: 400 })
    }
    const idea = await createIdea({
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
