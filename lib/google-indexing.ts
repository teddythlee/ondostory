import { GoogleAuth } from 'google-auth-library'

const INDEXING_API_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish'

async function getAccessToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}')

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  })

  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token || ''
}

export async function notifyGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return { ok: false, skipped: 'GOOGLE_SERVICE_ACCOUNT_KEY 미설정' }
  }

  try {
    const accessToken = await getAccessToken()
    const response = await fetch(INDEXING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url, type }),
    })

    const result = await response.json()
    console.log('Google Indexing API response:', result)
    // 성공 시 result.urlNotificationMetadata, 실패 시 result.error{code,message}
    return { ok: response.ok, status: response.status, response: result }
  } catch (err) {
    console.error('Google Indexing API error:', err)
    return { ok: false, error: String(err) }
  }
}

export async function notifyIndexNow(url: string) {
  const apiKey = process.env.INDEXNOW_API_KEY
  if (!apiKey) return { ok: false, skipped: 'INDEXNOW_API_KEY 미설정' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
  const host = new URL(siteUrl).hostname

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: apiKey,
        keyLocation: `${siteUrl}/${apiKey}.txt`,
        urlList: [url],
      }),
    })
    console.log('IndexNow response:', res.status)
    // 200/202 = 수락, 403 = key 불일치, 422 = URL/키 위치 문제
    return { ok: res.ok, status: res.status }
  } catch (err) {
    console.error('IndexNow error:', err)
    return { ok: false, error: String(err) }
  }
}

export async function notifyGoogleSitemapPing(siteUrl: string) {
  const sitemapUrl = `${siteUrl}/sitemap.xml`
  try {
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`)
    console.log('Pinged Google sitemap:', sitemapUrl)
  } catch (err) {
    console.error('Sitemap ping error:', err)
  }
}
