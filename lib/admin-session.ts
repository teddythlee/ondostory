/**
 * 관리자 세션 토큰(자체 서명, HMAC-SHA256).
 *
 * 기존에는 쿠키에 Supabase 액세스 토큰(기본 1시간 만료)을 담아, 쿠키 수명이 7일이어도
 * 실제로는 한 시간마다 재로그인해야 했다. 여기서는 Supabase와 무관하게 우리가 서명한
 * 장수명 토큰을 발급해 60일간 로그인 상태를 유지한다. (crypto.subtle → Workers 호환)
 *
 * 비밀키: ADMIN_SESSION_SECRET가 있으면 사용, 없으면 SUPABASE_SERVICE_ROLE_KEY로 폴백
 * (서버 전용·고엔트로피라 단일 관리자 블로그엔 충분). 키를 바꾸면 모든 세션이 무효화된다.
 */

export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 60 // 60일(초)

export interface AdminIdentity {
  sub: string
  email: string
}

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('ADMIN_SESSION_SECRET / SUPABASE_SERVICE_ROLE_KEY 미설정')
  return s
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return bytesToB64url(new Uint8Array(sig))
}

/** 길이·내용 모두 상수시간 비교(타이밍 공격 방지). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export async function createAdminSessionToken(identity: AdminIdentity): Promise<string> {
  const payloadObj = {
    sub: identity.sub,
    email: identity.email,
    exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  }
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify(payloadObj)))
  const sig = await sign(payload)
  return `${payload}.${sig}`
}

export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<AdminIdentity | null> {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot < 1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expected = await sign(payload)
  if (!safeEqual(sig, expected)) return null

  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)))
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return null
    if (!data.sub) return null
    return { sub: String(data.sub), email: String(data.email ?? '') }
  } catch {
    return null
  }
}
