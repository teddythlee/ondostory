// Google service-account access-token minter for the Cloudflare Workers runtime.
//
// We sign the JWT assertion ourselves with Web Crypto (crypto.subtle) and exchange
// it at the Google OAuth token endpoint, because google-auth-library fails on the
// Workers runtime ("Could not refresh access token"). This is the same approach
// proven in lib/gsc.ts, extracted here so the Indexing API path can reuse it.
//
// Env is read inside the function (not at module load) for Workers timing.

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

// One cached token per scope — a single request may mint several.
const cache = new Map<string, { token: string; exp: number }>()

export async function getGoogleAccessToken(scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const hit = cache.get(scope)
  if (hit && hit.exp - 60 > now) return hit.token

  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}') as {
    client_email?: string
    private_key?: string
    token_uri?: string
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error('service account key missing client_email/private_key')
  }

  const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token'
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({ iss: creds.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 })
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

  cache.set(scope, { token: data.access_token, exp: now + 3600 })
  return data.access_token
}
