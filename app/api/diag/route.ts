export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// 임시 진단용 — 런타임에 어떤 env가 실제로 주입되는지 길이/키 목록만 반환(값 노출 X).
export async function GET() {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PEXELS_API_KEY',
    'INDEXNOW_API_KEY',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'NODE_ENV',
  ]
  const processEnv: Record<string, number> = {}
  for (const k of keys) processEnv[k] = (process.env[k] || '').length

  let cfEnvKeys: string[] = []
  let cfServiceKeyLen = -1
  try {
    const { env } = getCloudflareContext()
    cfEnvKeys = Object.keys(env || {}).sort()
    cfServiceKeyLen = String((env as Record<string, unknown>)?.SUPABASE_SERVICE_ROLE_KEY ?? '').length
  } catch (e) {
    cfEnvKeys = ['ERROR: ' + (e instanceof Error ? e.message : String(e))]
  }

  return NextResponse.json({ marker: 'diag-v2', processEnv, cfEnvKeys, cfServiceKeyLen })
}
