export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adoptCandidate, dismissCandidate } from '@/lib/candidates'

// PATCH /api/ideas/candidates/<id>  { action: 'adopt' | 'dismiss', cluster?: string }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as { action?: string; cluster?: string | null }

    if (body.action === 'dismiss') {
      await dismissCandidate(id)
      return NextResponse.json({ ok: true, status: 'dismissed' })
    }
    if (body.action === 'adopt') {
      const { ideaId } = await adoptCandidate(id, body.cluster)
      return NextResponse.json({ ok: true, status: 'adopted', ideaId, ideaUrl: '/admin/ideas' })
    }
    return NextResponse.json({ error: "action은 'adopt' 또는 'dismiss'" }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
