export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getPostByIdAdmin } from '@/lib/posts'
import { renderContentTokens } from '@/lib/content-tokens'
import EmailReveal from '@/components/blog/EmailReveal'
import PopupModal from '@/components/blog/PopupModal'

interface Props { params: Promise<{ id: string }> }

// 발행 전 상세 미리보기 — [팝업:]·[메일문의:] 토큰이 실제 상세 페이지처럼 렌더된다.
// 발행 페이지(/blog/[slug])와 같은 renderContentTokens + EmailReveal + PopupModal을 쓴다.
// 관리자 세션 전용. 검색엔진 색인 안 됨(noindex).
export default async function DraftPreviewPage({ params }: Props) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const post = await getPostByIdAdmin(id)
  if (!post) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span>
          <strong>미리보기</strong> — 발행 전 화면입니다. 팝업·메일 링크가 실제 상세처럼 동작합니다.
          {post.status === 'published' && ' (이미 발행됨)'}
        </span>
        <Link href={`/admin/posts/${id}`} className="shrink-0 font-medium text-amber-900 underline">
          편집으로
        </Link>
      </div>

      <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 md:text-4xl">{post.title}</h1>

      <article
        className="prose text-gray-800"
        dangerouslySetInnerHTML={{ __html: renderContentTokens(post.content) }}
      />
      <EmailReveal />
      <PopupModal />
    </div>
  )
}
