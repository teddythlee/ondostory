export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { notifyGoogleIndexing, notifyIndexNow } from '@/lib/google-indexing'

// 온디맨드 갱신 엔드포인트.
// admin 에디터 저장은 /api/posts가 알아서 revalidate 하지만, 콘텐츠를 SQL이나 외부에서
// 직접 고치면 그 경로를 안 타므로 10분 ISR을 기다려야 한다. 그럴 때 이걸 한 번 호출하면
// 해당 페이지를 즉시 새로 렌더시킨다(재배포 불필요).
//
//   POST /api/revalidate   Authorization: Bearer <DRAFT_API_TOKEN>
//   body: { "slug": "costco-beef-cuts-korean" }   또는   { "path": "/blog/..." }
//         slug/path 배열도 허용: { "slugs": ["a","b"] }
//   { "index": true } 를 함께 주면 Google Indexing API + IndexNow로 크롤 제출까지 한다
//   (일반 revalidate는 가볍게 유지하려고 index는 opt-in. 병렬 처리라 URL 여러 개여도 지연 ~1-2s).

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

  // 진단: 시크릿 값은 노출하지 않고 상태만 검사(client_email·project_id는 비밀 아님).
  if (body.diagnose === true) {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''
    let parsed: Record<string, unknown> | null = null
    let parseError: string | undefined
    try { parsed = JSON.parse(raw) } catch (e) { parseError = String(e) }
    const pk = typeof parsed?.private_key === 'string' ? (parsed.private_key as string) : ''
    return NextResponse.json({
      google_key: {
        present: raw.length > 0,
        length: raw.length,
        parses: !!parsed,
        parseError,
        has_client_email: !!parsed?.client_email,
        has_private_key: !!parsed?.private_key,
        client_email: parsed?.client_email,
        project_id: parsed?.project_id,
        private_key_starts_ok: pk.startsWith('-----BEGIN PRIVATE KEY-----'),
        private_key_has_real_newline: pk.includes('\n'),
        private_key_has_literal_backslash_n: pk.includes('\\n'),
      },
      indexnow_key_present: !!process.env.INDEXNOW_API_KEY,
    })
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

  // index:true 일 때만 Google Indexing API + IndexNow로 크롤 제출(병렬 allSettled).
  // 각 URL별 실제 응답을 그대로 담아 반환 — 일반 revalidate는 외부 호출 없이 가볍게 유지.
  type IndexResult = { url: string; google: unknown; indexnow: unknown }
  let indexed: IndexResult[] = []
  if (body.index === true) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'
    const blogUrls = list
      .filter((p) => p.startsWith('/blog/') && p !== '/blog')
      .map((p) => `${siteUrl}${p}`)
    const settled = await Promise.allSettled(
      blogUrls.map(async (url): Promise<IndexResult> => {
        const [google, indexnow] = await Promise.all([
          notifyGoogleIndexing(url, 'URL_UPDATED'),
          notifyIndexNow(url),
        ])
        return { url, google, indexnow }
      })
    )
    indexed = settled
      .filter((s): s is PromiseFulfilledResult<IndexResult> => s.status === 'fulfilled')
      .map((s) => s.value)
  }

  return NextResponse.json({ ok: true, revalidated: list, indexed })
}
