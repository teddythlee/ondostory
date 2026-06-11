export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const code = error.code || error.message
    if (code === 'invalid_credentials' || code?.includes('Invalid login')) {
      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.', code: 'invalid_credentials' }, { status: 401 })
    }
    if (code === 'email_not_confirmed') {
      return NextResponse.json({ error: '이메일 인증이 완료되지 않았습니다.', code: 'email_not_confirmed' }, { status: 401 })
    }
    if (code === 'user_not_found') {
      return NextResponse.json({ error: '등록되지 않은 이메일입니다.', code: 'user_not_found' }, { status: 401 })
    }
    return NextResponse.json({ error: `서버 오류: ${error.message}`, code: 'server_error' }, { status: 500 })
  }

  if (!data.session) {
    return NextResponse.json({ error: '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.', code: 'server_error' }, { status: 500 })
  }

  if (data.user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_token')
  return response
}
