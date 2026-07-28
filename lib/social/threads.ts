import { supabaseAdmin } from '@/lib/supabase' // lazy Proxy — createClient() 호출 안 함
import { getPostByIdAdmin } from '@/lib/posts'

// Buffer 비공개 GraphQL. 공식 REST가 아니라 예고 없이 바뀔 수 있음 → social_posts 실패 모니터링 필수.
const BUFFER_ENDPOINT = 'https://api.buffer.com'

// ⏸ 스레드 자동 게시 일시 정지 — Buffer에 연결된 Threads 계정이 정지됨(2026-07-27).
// 재개하려면 false로 바꾸고 main 푸시(배포). pushToThreads·retry 모두 즉시 no-op이 된다.
const THREADS_PUBLISH_PAUSED = true

// Buffer의 CreatePostInput(우리 TS 타입과 이름만 같음, 별개). shareNow=즉시 게시로 검증됨(2026-07).
const CREATE_POST = `mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}`

/**
 * 발행된 글의 social_hook을 스레드(Buffer 경유)로 게시한다.
 * - 예외를 전부 삼킨다: 스레드가 죽어도 블로그 발행은 성공해야 한다.
 * - unique(post_id, platform) + insert-first로 중복 게시를 막는다(재편집·재실행 방어).
 * - dispatched = Buffer가 접수·post id 발급까지. 스레드 실제 노출 확인은 아니다(Buffer→스레드는 다운스트림).
 */
export async function pushToThreads(post: {
  id: string // posts.id = uuid
  slug: string
  social_hook: string | null
}): Promise<void> {
  if (THREADS_PUBLISH_PAUSED) return // ⏸ 위 상수로 전체 정지 (계정 정지)
  if (!post.social_hook?.trim()) return
  // 미설정이면 no-op: 행을 만들지 않아, 빈 설정으로 배포해도 글이 오염되지 않는다.
  const token = process.env.BUFFER_ACCESS_TOKEN
  const channelId = process.env.BUFFER_THREADS_CHANNEL_ID
  if (!token || !channelId) return

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'
  const url = `${siteUrl}/blog/${post.slug}` // 루트 아님, /blog/ 아래
  const text = `${post.social_hook.trim()}\n\n${url}`

  // unique(post_id, platform) 위반 = 이미 보낸 글 → 조용히 종료
  const { error: insertErr } = await supabaseAdmin
    .from('social_posts')
    .insert({ post_id: post.id, platform: 'threads', text })
  if (insertErr) return

  try {
    const res = await fetch(BUFFER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: CREATE_POST,
        variables: {
          input: {
            text,
            channelId,
            schedulingType: 'automatic',
            mode: 'shareNow', // 즉시 게시. dueAt 불필요
            assets: [], // NON_NULL — 텍스트 전용이라도 빈 배열 필수
          },
        },
      }),
    })

    // GraphQL은 실패해도 HTTP 200을 준다. res.ok로 판단하면 안 되고 본문을 봐야 한다.
    const json = await res.json()
    if (json?.errors?.length) {
      throw new Error(`graphql: ${JSON.stringify(json.errors).slice(0, 300)}`)
    }
    const result = json?.data?.createPost
    if (!result?.post?.id) {
      throw new Error(`buffer: ${result?.message ?? JSON.stringify(json).slice(0, 300)}`)
    }

    await supabaseAdmin
      .from('social_posts')
      .update({
        status: 'dispatched',
        external_id: result.post.id,
        dispatched_at: new Date().toISOString(),
      })
      .match({ post_id: post.id, platform: 'threads' })
  } catch (e) {
    await supabaseAdmin
      .from('social_posts')
      .update({ status: 'failed', error: String(e).slice(0, 500) })
      .match({ post_id: post.id, platform: 'threads' })
  }
}

export interface FailedSocialPost {
  id: string
  post_id: string
  text: string
  status: string
  error: string | null
  created_at: string
  post: { title: string; slug: string } | null
}

// 어드민 재시도 화면용: 실패했거나(failed) Buffer 응답 전에 멈춘(pending) 스레드 게시 목록.
export async function getStuckThreadsPosts(): Promise<FailedSocialPost[]> {
  const { data, error } = await supabaseAdmin
    .from('social_posts')
    .select('id, post_id, text, status, error, created_at, post:posts(title, slug)')
    .eq('platform', 'threads')
    .in('status', ['failed', 'pending'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as FailedSocialPost[]
}

/**
 * 재시도: 기존 행(unique 잠금)을 지우고 다시 게시한다.
 * 주의: dispatched(성공) 행에는 쓰지 않는다 — 중복 게시가 된다. 실패/멈춤 행에만.
 */
export async function retryThreadsPost(
  postId: string
): Promise<{ ok: boolean; status: string; error?: string }> {
  await supabaseAdmin.from('social_posts').delete().match({ post_id: postId, platform: 'threads' })
  const post = await getPostByIdAdmin(postId)
  if (!post) return { ok: false, status: 'missing', error: '글을 찾을 수 없음' }
  await pushToThreads({ id: post.id, slug: post.slug, social_hook: post.social_hook })
  const { data } = await supabaseAdmin
    .from('social_posts')
    .select('status, error')
    .match({ post_id: postId, platform: 'threads' })
    .maybeSingle()
  if (!data) return { ok: false, status: 'skipped', error: '훅 없음 또는 Buffer 미설정 — 게시 안 됨' }
  return { ok: data.status === 'dispatched', status: data.status, error: data.error ?? undefined }
}
