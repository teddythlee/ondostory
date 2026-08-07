export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getCandidates } from '@/lib/candidates'
import { rankCandidates } from '@/lib/candidate-rank'
import { supabaseAdmin } from '@/lib/supabase'

// 자율 조사 에이전트가 "다음에 쓸 주제"를 고르는 인터페이스.
// 원 score(수요만)를 RPM등급×후킹×이길수있음으로 재정렬해 상위 N개를 준다.
// 인증: 관리자 세션 쿠키 또는 Bearer(DISCOVERY_TOKEN / DRAFT_API_TOKEN) — 크론과 토큰 공유.
async function authorize(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const valid = [process.env.DISCOVERY_TOKEN, process.env.DRAFT_API_TOKEN].filter(Boolean) as string[]
  if (token && valid.includes(token)) return true
  return !!(await getAdminSession())
}

// GET /api/ideas/next?limit=5 → 재랭크된 상위 후보(+점수 분해)
export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const limit = Math.min(20, Math.max(1, Number(new URL(req.url).searchParams.get('limit')) || 5))
    const cands = await getCandidates('new', 100)
    const candidates = rankCandidates(cands)
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        topic: c.topic,
        query: c.query,
        cluster: c.cluster,
        source: c.source,
        impressions: c.impressions,
        position: c.position,
        rationale: c.rationale,
        evidence: c.evidence,
        score: c.rank.final,
        breakdown: c.rank,
      }))
    return NextResponse.json({ ok: true, count: candidates.length, candidates })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/ideas/next { id } → 후보 소진 처리(status=adopted). 초안 만든 뒤 큐에서 뺀다.
export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string }
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })
    const { error } = await supabaseAdmin
      .from('idea_candidates')
      .update({ status: 'adopted', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true, status: 'adopted', id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
