export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// 임시 진단용 — 런타임에 어떤 env가 실제로 주입되는지 길이만 반환(값 노출 X).
// 원인 파악 후 삭제 예정.
export async function GET() {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'PEXELS_API_KEY',
    'INDEXNOW_API_KEY',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'NODE_ENV',
  ]
  const runtimeEnvLengths: Record<string, number> = {}
  for (const k of keys) runtimeEnvLengths[k] = (process.env[k] || '').length
  return NextResponse.json({ marker: 'diag-v1', runtimeEnvLengths })
}
