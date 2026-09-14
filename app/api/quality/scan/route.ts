export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { runQualityScan } from '@/lib/quality-system'

async function authorize(req: NextRequest): Promise<{ ok: boolean; scheduled: boolean }> {
  const configured = process.env.DISCOVERY_TOKEN
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (configured && token && token === configured) return { ok: true, scheduled: true }
  return { ok: !!(await getAdminSession()), scheduled: false }
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const run = await runQualityScan(auth.scheduled ? 'scheduled' : 'manual')
    return NextResponse.json({ ok: true, run })
  } catch (error) {
    const message = error instanceof Error ? error.message : '품질 점검에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
