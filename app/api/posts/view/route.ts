import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { slug } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // 본인(관리자) 제외: 로그인 쿠키가 있으면 조회수를 올리지 않는다.
  if (req.cookies.get('admin_token')?.value) {
    return NextResponse.json({ ok: true, skipped: 'admin' })
  }

  await supabaseAdmin.rpc('increment_view_count', { post_slug: slug })

  return NextResponse.json({ ok: true })
}
