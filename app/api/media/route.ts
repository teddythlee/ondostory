export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin.storage.from('blog-images').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const files = (data ?? []).map((file) => {
    const { data: urlData } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(file.name)
    return {
      name: file.name,
      created_at: file.created_at,
      url: urlData.publicUrl,
    }
  })

  return NextResponse.json({ files })
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as { name?: string }
  if (!body.name) return NextResponse.json({ error: '파일명이 없습니다.' }, { status: 400 })

  const { error } = await supabaseAdmin.storage.from('blog-images').remove([body.name])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
