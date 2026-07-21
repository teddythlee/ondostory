export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createPost } from '@/lib/posts'
import { getClustersAdmin } from '@/lib/clusters'
import type { CreatePostInput } from '@/types'

// 콘텐츠 인제스트 엔드포인트.
// - 인증: Authorization: Bearer <DRAFT_API_TOKEN> (wrangler 시크릿)
// - status는 서버에서 무조건 'draft'로 강제 (이 엔드포인트로는 발행 불가, 색인 트리거 없음)
// - 온도스토리 규칙 검증 후 posts 테이블에 insert. 발행은 사람이 /admin/drafts 에서.

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CATEGORIES = new Set(['후기', '정보'])

export async function POST(req: NextRequest) {
  // 1) 토큰 인증
  const configured = process.env.DRAFT_API_TOKEN
  if (!configured) {
    return NextResponse.json({ error: 'DRAFT_API_TOKEN가 서버에 설정되지 않았습니다 (wrangler secret put)' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token || token !== configured) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) 파싱
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const title = str(body.title)
  const slug = str(body.slug)
  const content = typeof body.content === 'string' ? body.content : ''
  const excerpt = str(body.excerpt)
  const category = body.category == null ? null : str(body.category)
  const cluster = str(body.cluster) || null
  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : null

  // 3) 검증 (온도스토리 규칙)
  const errors: string[] = []
  if (!title) errors.push('title 필수')
  if (!content) errors.push('content(HTML 문자열) 필수')
  if (!excerpt) errors.push('excerpt 필수')
  if (!slug) errors.push('slug 필수')
  else if (!SLUG_RE.test(slug)) errors.push('slug은 소문자·숫자·하이픈만(kebab-case)')
  else if (slug.split('-').length > 6) errors.push('slug은 6단어 이하')
  if (excerpt && (excerpt.length < 80 || excerpt.length > 200)) errors.push(`excerpt 길이 ${excerpt.length}자 — 140~160자 권장(80~200 허용)`)
  if (category !== null && !CATEGORIES.has(category)) errors.push("category는 '후기' 또는 '정보'만")
  if (body.tags != null && tags === null) errors.push('tags는 문자열 배열이어야 함')
  if (tags && (tags.length < 1 || tags.length > 8)) errors.push(`tags ${tags.length}개 — 1~8개(권장 4~6)`)

  if (cluster) {
    const clusters = await getClustersAdmin().catch(() => [])
    if (!clusters.some((c) => c.key === cluster)) {
      errors.push(`cluster '${cluster}' 없음 — 유효: ${clusters.map((c) => c.key).join(', ') || '(없음)'}`)
    }
  }

  if (errors.length) {
    return NextResponse.json({ error: '검증 실패', details: errors }, { status: 400 })
  }

  // 4) draft 강제 + insert (status는 body 무시하고 'draft')
  try {
    const input: CreatePostInput = {
      title,
      slug,
      content,
      excerpt,
      tags: tags ?? [],
      category,
      cluster,
      meta_title: str(body.meta_title) || undefined,
      meta_description: str(body.meta_description) || undefined,
      cover_image: str(body.cover_image) || undefined,
      status: 'draft',
    }
    const post = await createPost(input)
    return NextResponse.json(
      { ok: true, id: post.id, slug: post.slug, status: post.status, admin_url: `/admin/posts/${post.id}` },
      { status: 201 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'insert 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
