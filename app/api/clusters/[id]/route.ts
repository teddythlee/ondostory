export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { updateCluster, deleteCluster } from '@/lib/clusters'

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    if (body.key !== undefined) {
      const key = String(body.key).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
      if (!key) return NextResponse.json({ error: 'key는 영문 소문자/숫자/하이픈만 가능합니다' }, { status: 400 })
      body.key = key
    }
    const cluster = await updateCluster(id, body)
    return NextResponse.json(cluster)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (/duplicate key|unique/i.test(msg)) return NextResponse.json({ error: '이미 존재하는 key입니다' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params
    await deleteCluster(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
