export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getClustersAdmin, createCluster } from '@/lib/clusters'

export async function GET() {
  try {
    await requireAdmin()
    const clusters = await getClustersAdmin()
    return NextResponse.json(clusters)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    if (!body.key || !body.title) {
      return NextResponse.json({ error: 'key와 title은 필수입니다' }, { status: 400 })
    }
    // key는 URL 경로라 소문자/숫자/하이픈만 허용
    const key = String(body.key).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!key) return NextResponse.json({ error: 'key는 영문 소문자/숫자/하이픈만 가능합니다' }, { status: 400 })

    const cluster = await createCluster({ ...body, key })
    return NextResponse.json(cluster)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (/duplicate key|unique/i.test(msg)) return NextResponse.json({ error: '이미 존재하는 key입니다' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
