export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// 온디맨드 갱신 엔드포인트.
// admin 에디터 저장은 /api/posts가 알아서 revalidate 하지만, 콘텐츠를 SQL이나 외부에서
// 직접 고치면 그 경로를 안 타므로 10분 ISR을 기다려야 한다. 그럴 때 이걸 한 번 호출하면
// 해당 페이지를 즉시 새로 렌더시킨다(재배포 불필요).
//
//   POST /api/revalidate   Authorization: Bearer <DRAFT_API_TOKEN>
//   body: { "slug": "costco-beef-cuts-korean" }   또는   { "path": "/blog/..." }
//         slug/path 배열도 허용: { "slugs": ["a","b"] }

export async function POST(req: NextRequest) {
  const configured = process.env.DRAFT_API_TOKEN
  if (!configured) {
    return NextResponse.json({ error: 'DRAFT_API_TOKEN 미설정' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token || token !== configured) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 400 })
  }

  const paths = new Set<string>()
  const add = (v: unknown) => {
    const s = typeof v === 'string' ? v.trim() : ''
    if (!s) return
    paths.add(s.startsWith('/') ? s : `/blog/${s}`)
  }
  add(body.slug)
  add(body.path)
  if (Array.isArray(body.slugs)) body.slugs.forEach(add)
  if (Array.isArray(body.paths)) body.paths.forEach(add)

  if (paths.size === 0) {
    return NextResponse.json({ error: 'slug 또는 path 필요' }, { status: 400 })
  }

  const list = [...paths]
  for (const p of list) revalidatePath(p)
  revalidatePath('/blog') // 목록/글 순서도 같이 갱신

  return NextResponse.json({ ok: true, revalidated: list })
}
