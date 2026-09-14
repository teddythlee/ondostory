export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'
import { registerUploadedImage } from '@/lib/image-provenance'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

  const MIME_EXT: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg',
  }
  const extFromName = file.name.includes('.') ? file.name.split('.').pop() : undefined
  const ext = extFromName || MIME_EXT[file.type] || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('blog-images')
    .upload(filename, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('blog-images').getPublicUrl(filename)
  try {
    await registerUploadedImage(data.publicUrl)
  } catch (error) {
    await supabaseAdmin.storage.from('blog-images').remove([filename])
    const message = error instanceof Error ? error.message : '이미지 출처대장 등록 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
  return NextResponse.json({ url: data.publicUrl })
}
