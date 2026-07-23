export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getAllPostsAdminMeta, getPagesAdminMeta } from '@/lib/posts'
import { getClustersAdmin } from '@/lib/clusters'
import { getGscPageMap } from '@/lib/gsc'
import AdminLogoutButton from './LogoutButton'
import AdminPostsTable from './AdminPostsTable'

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const [posts, clusters, pages, gscBySlug] = await Promise.all([
    getAllPostsAdminMeta().catch(() => []),
    getClustersAdmin().catch(() => []),
    getPagesAdminMeta().catch(() => []),
    getGscPageMap().catch(() => ({})),
  ])
  const drafts = posts.filter((p) => p.status !== 'published')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-gray-900">ondostory</Link>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">관리자</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/ideas"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              아이디어
            </Link>
            <Link
              href="/admin/topics"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              주제 발굴
            </Link>
            <Link
              href="/admin/drafts"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              초안{drafts.length > 0 && <span className="ml-1 text-yellow-600 font-semibold">{drafts.length}</span>}
            </Link>
            <Link
              href="/admin/stats"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              통계
            </Link>
            <Link
              href="/admin/import"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              가져오기
            </Link>
            <Link
              href="/admin/media"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              미디어
            </Link>
            <Link
              href="/admin/posts/new"
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              + 새 글 쓰기
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">전체 글</p>
            <p className="text-3xl font-bold text-gray-900">{posts.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">발행된 글</p>
            <p className="text-3xl font-bold text-green-600">{posts.filter(p => p.status === 'published').length}</p>
          </div>
          <Link href="/admin/drafts" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-yellow-300 transition-colors">
            <p className="text-sm text-gray-500 mb-1">임시저장 (초안 검토)</p>
            <p className="text-3xl font-bold text-yellow-500">{drafts.length}</p>
          </Link>
        </div>

        <AdminPostsTable posts={posts} clusters={clusters} gscBySlug={gscBySlug} />

        {pages.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">페이지 (About·개인정보 등 — 슬러그 고정)</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/posts/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-900">{p.title}</span>
                  <span className="text-xs text-gray-400 font-mono">/{p.slug} · 수정 →</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
