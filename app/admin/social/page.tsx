export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getAdminSession } from '@/lib/auth'
import { getStuckThreadsPosts } from '@/lib/social/threads'
import AdminLogoutButton from '../LogoutButton'
import RetryButton from './RetryButton'

export default async function SocialPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const stuck = await getStuckThreadsPosts().catch(() => [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-bold text-gray-900">ondostory</Link>
            <span className="text-gray-300">·</span>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">관리자</Link>
            <span className="text-gray-300">›</span>
            <span className="text-sm text-gray-700">스레드</span>
          </div>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">스레드 게시 — 실패·재시도</h1>
        <p className="text-sm text-gray-500 mb-6">
          발행 시 Buffer로 나가지 못했거나(failed) 응답 전에 멈춘(pending) 건. 재시도하면 기존 기록을 지우고 다시 보낸다.
          <br />
          <span className="text-amber-600">
            주의: 이 목록이 비어 있어도 &ldquo;dispatched&rdquo;가 실제 스레드 노출을 보장하진 않는다(Buffer→스레드는 다운스트림).
          </span>
        </p>

        {stuck.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            실패·멈춤 건이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {stuck.map((row) => (
              <div key={row.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium rounded px-1.5 py-0.5 ${
                          row.status === 'failed'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {row.status}
                      </span>
                      {row.post ? (
                        <Link
                          href={`/admin/posts/${row.post_id}`}
                          className="text-sm font-medium text-gray-900 hover:underline truncate"
                        >
                          {row.post.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">(삭제된 글)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 whitespace-pre-line line-clamp-3">{row.text}</p>
                    {row.error && (
                      <p className="text-xs text-red-500 mt-1 break-all line-clamp-2">{row.error}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      {format(new Date(row.created_at), 'M월 d일 HH:mm', { locale: ko })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <RetryButton postId={row.post_id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
