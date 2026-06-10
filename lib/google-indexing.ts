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
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return

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
    return result
  } catch (err) {
    console.error('Google Indexing API error:', err)
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
