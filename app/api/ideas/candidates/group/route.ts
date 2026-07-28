export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adoptGroup, dismissGroup } from '@/lib/candidates'

// POST /api/ideas/candidates/group  { action:'adopt'|'dismiss', ids:string[], cluster?:string }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      ids?: string[]
      cluster?: string | null
    }
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === 'string') : []
    if (ids.length === 0) return NextResponse.json({ error: 'ids가 비었습니다' }, { status: 400 })

    if (body.action === 'dismiss') {
      await dismissGroup(ids)
      return NextResponse.json({ ok: true, status: 'dismissed', count: ids.length })
    }
    if (body.action === 'adopt') {
      const { ideaId } = await adoptGroup(ids, body.cluster)
      return NextResponse.json({ ok: true, status: 'adopted', ideaId, ideaUrl: '/admin/ideas' })
    }
    return NextResponse.json({ error: "action은 'adopt' 또는 'dismiss'" }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
