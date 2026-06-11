export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getAllPostsAdmin } from '@/lib/posts'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import AdminLogoutButton from './LogoutButton'

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const posts = await getAllPostsAdmin().catch(() => [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold text-gray-900">ondostory</Link>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">관리자</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/import"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              가져오기
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
            <p className="text-3xl font-bold text-green-600">{posts.filter(p => p.published).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">임시저장</p>
            <p className="text-3xl font-bold text-yellow-500">{posts.filter(p => !p.published).length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">글 목록</h2>
          </div>
          {posts.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="mb-4">작성된 글이 없습니다</p>
              <Link href="/admin/posts/new" className="text-blue-500 hover:underline text-sm">
                첫 글 작성하기 →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">제목</th>
                  <th className="px-6 py-3 text-left">태그</th>
                  <th className="px-6 py-3 text-left">상태</th>
                  <th className="px-6 py-3 text-left">날짜</th>
                  <th className="px-6 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/admin/posts/${post.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${post.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {post.published ? '발행됨' : '임시저장'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(post.created_at), 'yy.MM.dd', { locale: ko })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/posts/${post.id}`} className="text-sm text-blue-500 hover:underline mr-3">
                        편집
                      </Link>
                      {post.published && (
                        <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-gray-400 hover:underline">
                          보기
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
