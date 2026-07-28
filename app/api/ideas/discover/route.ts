export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { runDiscovery } from '@/lib/discovery'

// POST /api/ideas/discover — 글감 발굴 1회 실행.
//
// 인증 두 갈래:
//   1) Authorization: Bearer <DISCOVERY_TOKEN>  ← 매일 도는 크론(GitHub Actions)
//   2) 관리자 세션 쿠키                          ← /admin/discover 의 "지금 실행" 버튼
//
// 쿼리: ?suggest=16&community=8&limit=60 (Workers 서브리퀘스트 예산 조절용)

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
  const sp = new URL(req.url).searchParams
  const num = (k: string, d: number) => {
    const v = Number(sp.get(k))
    return Number.isFinite(v) && v > 0 ? v : d
  }
  try {
    const result = await runDiscovery({
      suggestCalls: num('suggest', 16),
      communityProbes: num('community', 8),
      limit: num('limit', 60),
    })
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'discovery 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
