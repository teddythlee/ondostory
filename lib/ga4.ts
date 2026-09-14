import { getGoogleAccessToken } from './google-token'

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const API = 'https://analyticsdata.googleapis.com/v1beta'

export interface Ga4PageMetrics {
  views: number
  sessions: number
  engagedSessions: number
  engagementRate: number
  averageSessionDuration: number
  activeUsers: number
}

interface Ga4Row {
  dimensionValues?: { value?: string }[]
  metricValues?: { value?: string }[]
}

function propertyId(): string {
  return process.env.GA4_PROPERTY_ID || '548218246'
}

/** 최근 90일 개별 글 성과. 관리자·홈 등은 slug 매핑 단계에서 제외한다. */
export async function getGa4PageMap(): Promise<Record<string, Ga4PageMetrics>> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return {}

  const token = await getGoogleAccessToken(SCOPE)
  const res = await fetch(`${API}/properties/${propertyId()}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: '90daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'activeUsers' },
      ],
      dimensionFilter: {
        filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/blog/' } },
      },
      limit: 1000,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GA4 ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = (await res.json()) as { rows?: Ga4Row[] }
  const map: Record<string, Ga4PageMetrics> = {}
  for (const row of data.rows || []) {
    const path = row.dimensionValues?.[0]?.value || ''
    const match = path.match(/^\/blog\/([^/?#]+)/)
    if (!match) continue
    const slug = decodeURIComponent(match[1])
    const values = row.metricValues || []
    map[slug] = {
      views: Number(values[0]?.value || 0),
      sessions: Number(values[1]?.value || 0),
      engagedSessions: Number(values[2]?.value || 0),
      engagementRate: Number(values[3]?.value || 0),
      averageSessionDuration: Number(values[4]?.value || 0),
      activeUsers: Number(values[5]?.value || 0),
    }
  }
  return map
}
