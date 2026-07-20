export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { snapshotRecent, snapshotBackfillMonthly } from '@/lib/gsc'

// POST /api/gsc/snapshot            → 최근 28일 스냅샷 1개 저장
// POST /api/gsc/snapshot?mode=backfill → 지난 13개월 월별 백필(시즌/YoY 시작점)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const mode = new URL(req.url).searchParams.get('mode')
    const inserted = mode === 'backfill' ? await snapshotBackfillMonthly(13) : await snapshotRecent()
    return NextResponse.json({ ok: true, mode: mode === 'backfill' ? 'backfill' : 'recent', inserted })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
