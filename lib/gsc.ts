import { GoogleAuth } from 'google-auth-library'

// Google Search Console (Search Analytics) reader.
// Reuses the existing GOOGLE_SERVICE_ACCOUNT_KEY service account (same one as
// the Indexing API) with a read-only scope. The service account is added to the
// GSC property `https://www.ondostory.com/` with Full permission.
// Env is read inside functions (not at module load) for the Workers runtime.

const GSC_API = 'https://searchconsole.googleapis.com/webmasters/v3'

function siteUrl(): string {
  return process.env.GSC_SITE_URL || 'https://www.ondostory.com/'
}

async function getToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}')
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token || ''
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

export interface GscInsights {
  configured: boolean
  range: { startDate: string; endDate: string }
  /** Queries sitting at positions ~8–20: one nudge from page 1. */
  opportunities: GscRow[]
  /** Pages with impressions but weak CTR: title/meta rewrite candidates. */
  lowCtrPages: GscRow[]
  /** Top queries by impressions, for context. */
  topQueries: GscRow[]
  error?: string
}

const emptyRange = () => ({ startDate: daysAgo(31), endDate: daysAgo(3) })

export async function getGscInsights(): Promise<GscInsights> {
  const range = emptyRange()
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return { configured: false, range, opportunities: [], lowCtrPages: [], topQueries: [] }
  }

  try {
    const [queries, pages] = await Promise.all([
      query({ ...range, dimensions: ['query'] }),
      query({ ...range, dimensions: ['page'] }),
    ])

    const opportunities = queries
      .filter((r) => r.position >= 8 && r.position <= 20.5)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25)

    const lowCtrPages = pages
      .filter((r) => r.impressions >= 5 && r.ctr < 0.05)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25)

    const topQueries = [...queries]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25)

    return { configured: true, range, opportunities, lowCtrPages, topQueries }
  } catch (err) {
    return {
      configured: true,
      range,
      opportunities: [],
      lowCtrPages: [],
      topQueries: [],
      error: err instanceof Error ? err.message : 'GSC query failed',
    }
  }
}
