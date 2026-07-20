// Google Search Console (Search Analytics) reader.
// Reuses the existing GOOGLE_SERVICE_ACCOUNT_KEY service account (same one as
// the Indexing API) with a read-only scope. The service account is added to the
// GSC property `https://www.ondostory.com/` with Full permission.
//
// Auth is done with Web Crypto (crypto.subtle), NOT google-auth-library, because
// that library fails on the Cloudflare Workers runtime ("Could not refresh
// access token"). We sign the JWT assertion ourselves and exchange it at the
// Google OAuth token endpoint. Env is read inside functions for Workers timing.

import { supabaseAdmin } from './supabase'

const GSC_API = 'https://searchconsole.googleapis.com/webmasters/v3'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

function siteUrl(): string {
  return process.env.GSC_SITE_URL || 'https://www.ondostory.com/'
}

function b64url(input: ArrayBuffer | string): string {
  let bin: string
  if (typeof input === 'string') {
    bin = input
  } else {
    const bytes = new Uint8Array(input)
    bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

// Token cache — a backfill makes many API calls in one request; reusing one
// token keeps subrequest count (Workers limit) and latency down.
let cachedToken: { token: string; exp: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.exp - 60 > Math.floor(Date.now() / 1000)) return cachedToken.token
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}') as {
    client_email?: string
    private_key?: string
    token_uri?: string
  }
  if (!creds.client_email || !creds.private_key) throw new Error('service account key missing client_email/private_key')

  const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token'
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({ iss: creds.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 })
  )
  const signingInput = `${header}.${claims}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(creds.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${b64url(sig)}`

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`token exchange ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('no access_token in token response')
  cachedToken = { token: data.access_token, exp: now + 3600 }
  return data.access_token
}

export interface GscRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface QueryBody {
  startDate: string
  endDate: string
  dimensions: string[]
  rowLimit?: number
}

async function query(body: QueryBody): Promise<GscRow[]> {
  const token = await getToken()
  const res = await fetch(
    `${GSC_API}/sites/${encodeURIComponent(siteUrl())}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowLimit: 250, ...body }),
    }
  )
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GSC ${res.status}: ${detail.slice(0, 300)}`)
  }
  const data = (await res.json()) as { rows?: GscRow[] }
  return data.rows || []
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
}

export interface GscQueryPage {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscInsights {
  configured: boolean
  range: { startDate: string; endDate: string }
  /** Queries sitting at positions ~8–20: one nudge from page 1. */
  opportunities: GscRow[]
  /** Pages with impressions but weak CTR: title/meta rewrite candidates. */
  lowCtrPages: GscRow[]
  /** Top query→landing-page pairs by impressions: coverage / content-gap discovery. */
  queryPages: GscQueryPage[]
  error?: string
}

const emptyRange = () => ({ startDate: daysAgo(90), endDate: daysAgo(3) })

export async function getGscInsights(): Promise<GscInsights> {
  const range = emptyRange()
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return { configured: false, range, opportunities: [], lowCtrPages: [], queryPages: [] }
  }

  try {
    const [queries, pages, qp] = await Promise.all([
      query({ ...range, dimensions: ['query'] }),
      query({ ...range, dimensions: ['page'] }),
      query({ ...range, dimensions: ['query', 'page'] }),
    ])

    const opportunities = queries
      .filter((r) => r.position >= 8 && r.position <= 20.5)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25)

    const lowCtrPages = pages
      .filter((r) => r.impressions >= 5 && r.ctr < 0.05)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25)

    const queryPages = qp
      .map((r) => ({
        query: r.keys[0],
        page: r.keys[1],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 40)

    return { configured: true, range, opportunities, lowCtrPages, queryPages }
  } catch (err) {
    return {
      configured: true,
      range,
      opportunities: [],
      lowCtrPages: [],
      queryPages: [],
      error: err instanceof Error ? err.message : 'GSC query failed',
    }
  }
}

// ── 스냅샷 저장 (추세 · 시즌/YoY 비교용) ─────────────────────────────────
// GSC는 ~16개월 롤링 집계만 준다. 시계열을 남기려면 주기적으로 떠서 저장해야 한다.
// 보관 16개월(작년 같은 시즌까지 YoY 비교 가능) — 초과분은 저장 때 prune.

const RETENTION_MONTHS = 16

interface StoredRow {
  taken_on: string
  period_start: string
  period_end: string
  dimension: 'query' | 'query_page'
  query: string | null
  page: string | null
  clicks: number
  impressions: number
  ctr: number
  position: number
}

async function fetchWindow(startDate: string, endDate: string): Promise<StoredRow[]> {
  const takenOn = daysAgo(0)
  const [queries, queryPages] = await Promise.all([
    query({ startDate, endDate, dimensions: ['query'], rowLimit: 500 }),
    query({ startDate, endDate, dimensions: ['query', 'page'], rowLimit: 500 }),
  ])
  const base = (r: GscRow) => ({
    taken_on: takenOn, period_start: startDate, period_end: endDate,
    clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  })
  return [
    ...queries.map((r) => ({ ...base(r), dimension: 'query' as const, query: r.keys[0], page: null })),
    ...queryPages.map((r) => ({ ...base(r), dimension: 'query_page' as const, query: r.keys[0], page: r.keys[1] })),
  ]
}

async function persistWindow(startDate: string, endDate: string): Promise<number> {
  const rows = await fetchWindow(startDate, endDate)
  if (rows.length === 0) return 0
  // 같은 구간 재저장 시 중복 방지
  await supabaseAdmin.from('gsc_snapshots').delete().eq('period_start', startDate).eq('period_end', endDate)
  const { error } = await supabaseAdmin.from('gsc_snapshots').insert(rows)
  if (error) throw error
  return rows.length
}

async function prune(): Promise<void> {
  await supabaseAdmin.from('gsc_snapshots').delete().lt('period_end', daysAgo(RETENTION_MONTHS * 31))
}

/** 최근 28일 구간 스냅샷 1개 저장 (수동 버튼·주간 cron용). */
export async function snapshotRecent(): Promise<number> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error('GSC not configured')
  const n = await persistWindow(daysAgo(31), daysAgo(3))
  await prune()
  return n
}

/** 지난 N개월을 월별 스냅샷으로 백필 (시즌·YoY 시작점). */
export async function snapshotBackfillMonthly(months = 13): Promise<number> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error('GSC not configured')
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  let total = 0
  for (let i = 1; i <= months; i++) {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const last = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const start = `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`
    const end = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`
    total += await persistWindow(start, end)
  }
  await prune()
  return total
}

/** 저장된 스냅샷 요약. */
export async function getSnapshotSummary(): Promise<{ count: number; latest: string | null }> {
  const { count } = await supabaseAdmin.from('gsc_snapshots').select('*', { count: 'exact', head: true })
  const { data } = await supabaseAdmin
    .from('gsc_snapshots')
    .select('period_end')
    .order('period_end', { ascending: false })
    .limit(1)
  return { count: count ?? 0, latest: data?.[0]?.period_end ?? null }
}
