// GSC URL 검사 API로 글별 색인 상태를 확인한다.
//
// 왜 필요한가: searchAnalytics는 "노출된 글"만 알려준다. 노출 0인 글이 (a) 색인이 안 된 건지
// (b) 색인은 됐는데 순위가 바닥인지 구분되지 않는다. 이 둘은 대응이 완전히 달라서
// (a)는 색인 문제, (b)는 콘텐츠·검색의도 문제 — URL 검사 API의 coverageState로 가른다.
//
//   node scripts/gsc-url-inspect.mjs            # 발행글 전체
//   node scripts/gsc-url-inspect.mjs <slug>...  # 특정 글만
//
// 쿼터: 하루 2,000건·분당 600건(2026-10 기준). 글 수십 개 수준이면 여유가 있다.
// 요청 간 200ms 간격을 둔다.

import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const slugArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const env = Object.fromEntries(
  readFileSync('.dev.vars', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY)
const siteUrl = env.GSC_SITE_URL || 'https://www.ondostory.com/'
const b64url = (buf) => Buffer.from(buf).toString('base64url')

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
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${header}.${claim}.${b64url(signer.sign(creds.private_key))}`,
  }),
})
if (!tokenRes.ok) throw new Error(`token exchange failed (${tokenRes.status}): ${await tokenRes.text()}`)
const token = (await tokenRes.json()).access_token

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
let query = supabase.from('posts').select('slug,noindex,cluster').eq('status', 'published').order('slug')
if (slugArgs.length) query = query.in('slug', slugArgs)
const { data: posts, error } = await query
if (error) throw error

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
for (const post of posts) {
  const inspectionUrl = `https://www.ondostory.com/blog/${post.slug}`
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: 'ko' }),
  })
  if (!res.ok) {
    const body = await res.text()
    results.push({ slug: post.slug, state: `ERROR ${res.status}`, detail: body.slice(0, 120) })
    if (res.status === 403 || res.status === 429) break
  } else {
    const idx = (await res.json()).inspectionResult?.indexStatusResult || {}
    results.push({
      slug: post.slug,
      noindex: post.noindex,
      cluster: post.cluster,
      verdict: idx.verdict,
      state: idx.coverageState,
      robots: idx.robotsTxtState,
      indexing: idx.indexingState,
      lastCrawl: idx.lastCrawlTime ? idx.lastCrawlTime.slice(0, 10) : null,
      canonicalMatch: idx.googleCanonical === idx.userCanonical,
    })
  }
  await sleep(200)
}

const byState = results.reduce((acc, r) => {
  acc[r.state || 'unknown'] = (acc[r.state || 'unknown'] || 0) + 1
  return acc
}, {})
console.log(JSON.stringify({ checked: results.length, byState }, null, 2))
console.log('---')
for (const r of results) {
  console.log([r.slug.padEnd(56), (r.state || '').padEnd(34), r.verdict || '', r.lastCrawl || '-', r.noindex ? 'noindex' : ''].join(' '))
}
