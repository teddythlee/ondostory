import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Cloudflare Workers(OpenNext)에서는 env 바인딩이 모듈 로드 시점엔 아직
 * process.env에 없고 요청 시점에 주입된다. 따라서 클라이언트를 top-level에서
 * 즉시 만들면 service role 키가 'placeholder'로 굳어 admin 인증/업로드/조회수가
 * 전부 깨진다. 첫 사용(요청 시점)에 지연 생성하도록 Proxy로 감싼다.
 */
function lazyClient(getKey: () => string): SupabaseClient {
  let client: SupabaseClient | null = null
  const init = () => {
    if (!client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
      client = createClient(url, getKey())
    }
    return client
  }
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const c = init() as unknown as Record<string | symbol, unknown>
      const value = c[prop]
      // 메서드(rpc, from, channel 등)는 실제 클라이언트에 바인딩해 this 유실 방지
      return typeof value === 'function' ? value.bind(c) : value
    },
  })
}

export const supabase = lazyClient(
  () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

export const supabaseAdmin = lazyClient(
  () => process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)
