export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { updateQualityWorkItem, type QualityManualChecks, type QualityWorkState } from '@/lib/quality-system'

const STATES = new Set<QualityWorkState>(['queued', 'improving', 'monitoring', 'resolved'])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { postId } = await params
    const body = (await req.json()) as { state?: QualityWorkState; notes?: string; manualChecks?: QualityManualChecks }
    if (!body.state || !STATES.has(body.state)) {
      return NextResponse.json({ error: '올바른 작업 상태가 필요합니다.' }, { status: 400 })
    }
    const item = await updateQualityWorkItem(postId, {
      state: body.state,
      notes: body.notes,
      manualChecks: body.manualChecks,
    })
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    const message = error instanceof Error ? error.message : '작업 상태 저장에 실패했습니다.'
    const status = message.startsWith('해결 처리하려면') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
