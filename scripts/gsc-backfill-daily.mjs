// gsc_daily 일별 총계 백필 — 임의 구간을 다시 채운다.
//
// 왜 필요한가: 정기 수집(lib/gsc.ts snapshotDaily)은 최근 14일만 가져온다. 크론이 멈춰
// 2026-08-06~09-16 구간이 빈 것처럼, 14일을 넘긴 공백은 이 스크립트로만 메울 수 있다.
// GSC는 약 16개월을 보관하므로 그 안의 구간이면 언제든 복구된다.
//
//   node scripts/gsc-backfill-daily.mjs 2026-08-06 2026-09-16          # 미리보기
//   node scripts/gsc-backfill-daily.mjs 2026-08-06 2026-09-16 --apply  # 저장
//
// 인증은 lib/gsc.ts와 같은 서비스 계정(GOOGLE_SERVICE_ACCOUNT_KEY)을 쓴다. 다만 여기서는
// Workers 런타임이 아니라 node라서 node:crypto로 JWT를 서명한다.

import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [, , startDate, endDate] = process.argv
const apply = process.argv.includes('--apply')
if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(endDate || '')) {
  throw new Error('사용법: node scripts/gsc-backfill-daily.mjs <YYYY-MM-DD> <YYYY-MM-DD> [--apply]')
}

const env = Object.fromEntries(
  readFileSync('.dev.vars', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
for (const name of ['GOOGLE_SERVICE_ACCOUNT_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!env[name]) throw new Error(`Missing ${name} in .dev.vars`)
}

const creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY)
const siteUrl = env.GSC_SITE_URL || 'https://www.ondostory.com/'
const b64url = (buf) => Buffer.from(buf).toString('base64url')

async function getToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const assertion = `${header}.${claim}.${b64url(signer.sign(creds.private_key))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`token exchange failed (${res.status}): ${await res.text()}`)
  return (await res.json()).access_token
}

const token = await getToken()
const res = await fetch(
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
  {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions: ['date'], rowLimit: 500 }),
  },
)
if (!res.ok) throw new Error(`searchAnalytics failed (${res.status}): ${await res.text()}`)
const rows = (await res.json()).rows || []
const recs = rows.map((r) => ({
  day: r.keys[0],
  clicks: r.clicks,
  impressions: r.impressions,
  ctr: r.ctr,
  position: r.position,
  updated_at: new Date().toISOString(),
}))

const totalImpr = recs.reduce((s, r) => s + r.impressions, 0)
const totalClicks = recs.reduce((s, r) => s + r.clicks, 0)
console.log(`${startDate} ~ ${endDate}: ${recs.length}일, 노출 ${totalImpr}, 클릭 ${totalClicks}`)
if (!apply) {
  console.log('DRY RUN — 저장하려면 --apply')
  process.exit(0)
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { error } = await supabase.from('gsc_daily').upsert(recs, { onConflict: 'day' })
if (error) throw error
console.log(`저장 완료 ${recs.length}일`)
