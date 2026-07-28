export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCandidates } from '@/lib/candidates'
import type { CandidateStatus } from '@/lib/candidates'

const STATUSES = new Set(['new', 'adopted', 'dismissed'])

// GET /api/ideas/candidates?status=new
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const raw = new URL(req.url).searchParams.get('status') || 'new'
    const status = (STATUSES.has(raw) ? raw : 'new') as CandidateStatus
    return NextResponse.json(await getCandidates(status))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
