export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getIdeas } from '@/lib/ideas'
import { supabaseAdmin } from '@/lib/supabase'
import AdminLogoutButton from '../LogoutButton'
import IdeasManager from './IdeasManager'

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ shared?: string; share?: string; edit?: string; got?: string }> }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const allIdeas = await getIdeas().catch(() => [])
  // 연결된 글이 이미 "발행"된 아이디어는 목록에서 뺀다 — 할 일이 끝났으니(발행된 글이 곧 기록).
  const linkedPostIds = allIdeas.map((i) => i.post_id).filter((id): id is string => !!id)
  let publishedIds = new Set<string>()
  if (linkedPostIds.length) {
    const { data } = await supabaseAdmin.from('posts').select('id').eq('status', 'published').in('id', linkedPostIds)
    publishedIds = new Set((data || []).map((p) => p.id as string))
  }
  const ideas = allIdeas.filter((i) => !(i.post_id && publishedIds.has(i.post_id)))
  const sp = await searchParams
  const sharedImages = sp.shared ? sp.shared.split(',').filter(Boolean) : []
  const shareFailed = sp.share === 'fail'
  const sharedEditId = sp.edit ?? ''
  const shareGot = sp.got ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-bold text-gray-900">ondostory</Link>
            <span className="text-gray-300">·</span>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">관리자</Link>
            <span className="text-gray-300">›</span>
            <span className="text-sm text-gray-700">아이디어</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">← 목록</Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">아이디어 (글감)</h1>
          <p className="text-sm text-gray-500 mt-1">
            겪은 것만 불릿으로 던지고 <strong>사진도 함께 첨부</strong>하세요(구글포토·갤러리에서 골라 올리면 됨). 나중에 Claude가 이걸 읽어 <strong>사진까지 넣은</strong> 초안으로 만들어 <Link href="/admin/drafts" className="text-blue-500 hover:underline">초안 검토 큐</Link>에 넣어줍니다.
            <br />
            뭘 쓸지 막막하면 <Link href="/admin/discover" className="text-blue-500 hover:underline">글감 발굴</Link>에서 매일 쌓이는 후보를 보세요.
          </p>
        </div>
        <IdeasManager initial={ideas} sharedImages={sharedImages} shareFailed={shareFailed} sharedEditId={sharedEditId} shareGot={shareGot} />
      </main>
    </div>
  )
}
