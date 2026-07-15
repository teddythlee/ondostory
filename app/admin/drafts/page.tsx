export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getAdminSession } from '@/lib/auth'
import { getAllPostsAdmin } from '@/lib/posts'
import { getClustersAdmin } from '@/lib/clusters'
import AdminLogoutButton from '../LogoutButton'

// 초안에 남은 "사람이 채워야 할 것" 마커를 센다 (ondostory-draft 스킬이 남기는 표시)
function countMarkers(content: string) {
  const needFill = (content.match(/\[\[확인 필요/g) || []).length
  const photos = (content.match(/\[사진/g) || []).length
  return { needFill, photos }
}

export default async function DraftsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const [posts, clusters] = await Promise.all([
    getAllPostsAdmin().catch(() => []),
    getClustersAdmin().catch(() => []),
  ])
  const clusterMap = new Map(clusters.map((c) => [c.key, c]))
  const drafts = posts.filter((p) => p.status !== 'published')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-bold text-gray-900">ondostory</Link>
            <span className="text-gray-300">·</span>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">관리자</Link>
            <span className="text-gray-300">›</span>
            <span className="text-sm text-gray-700">초안</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← 전체 목록
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
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">초안 검토 큐</h1>
          <p className="text-sm text-gray-500 mt-1">
            검토할 초안 <span className="font-semibold text-gray-900">{drafts.length}</span>개.
            {' '}각 글의 <span className="text-orange-600">확인 필요</span>·<span className="text-blue-600">사진</span> 마커를 채우고 발행하세요.
          </p>
        </div>

        {drafts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="font-semibold text-gray-900 mb-1">검토할 초안이 없습니다</p>
            <p className="text-sm text-gray-500">
              AI가 초안을 생성하거나 글을 임시저장하면 여기 모입니다.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400">제목</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">허브 / 유형</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">채울 것</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">작성일</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((post) => {
                  const { needFill, photos } = countMarkers(post.content || '')
                  const cl = post.cluster ? clusterMap.get(post.cluster) : null
                  const ready = needFill === 0 && photos === 0
                  return (
                    <tr key={post.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <Link href={`/admin/posts/${post.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
                          {post.title || '(제목 없음)'}
                        </Link>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{post.excerpt}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{cl ? `${cl.emoji} ${cl.nav_label}` : '— 미분류 —'}</span>
                        {post.category && <span className="text-xs text-gray-400"> · {post.category}</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {ready ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">발행 준비됨</span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            {needFill > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">확인 필요 {needFill}</span>
                            )}
                            {photos > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">사진 {photos}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {format(new Date(post.created_at), 'yy.MM.dd', { locale: ko })}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <Link href={`/admin/posts/${post.id}`} className="text-sm text-blue-500 hover:underline">
                          검토·편집 →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
