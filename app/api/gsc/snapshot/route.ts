export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { snapshotRecent, snapshotBackfillMonthly } from '@/lib/gsc'

// POST /api/gsc/snapshot            → 최근 28일 스냅샷 1개 저장
// POST /api/gsc/snapshot?mode=backfill → 지난 13개월 월별 백필(시즌/YoY 시작점)
//
// 인증 두 갈래: 관리자 세션 쿠키(/admin/topics 버튼) 또는
// Authorization: Bearer <DISCOVERY_TOKEN>(주간 크론). 발굴 크론과 토큰을 공유한다.
async function authorize(req: NextRequest): Promise<boolean> {
  const configured = process.env.DISCOVERY_TOKEN
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (configured && token && token === configured) return true
  return !!(await getAdminSession())
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const mode = new URL(req.url).searchParams.get('mode')
    const inserted = mode === 'backfill' ? await snapshotBackfillMonthly(13) : await snapshotRecent()
    return NextResponse.json({ ok: true, mode: mode === 'backfill' ? 'backfill' : 'recent', inserted })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
