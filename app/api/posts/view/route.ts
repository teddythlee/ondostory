import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { slug } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  await supabaseAdmin.rpc('increment_view_count', { post_slug: slug })

  return NextResponse.json({ ok: true })
}
