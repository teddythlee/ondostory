export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getCandidates, getRecentRuns } from '@/lib/candidates'
import { getClustersAdmin } from '@/lib/clusters'
import AdminLogoutButton from '../LogoutButton'
import CandidatesManager from './CandidatesManager'

export default async function DiscoverPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const [candidates, runs, clusters] = await Promise.all([
    getCandidates('new').catch(() => []),
    getRecentRuns(5).catch(() => []),
    getClustersAdmin().catch(() => []),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-bold text-gray-900">ondostory</Link>
            <span className="text-gray-300">·</span>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">관리자</Link>
            <span className="text-gray-300">›</span>
            <span className="text-sm text-gray-700">글감 발굴</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/ideas" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">아이디어 →</Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">글감 발굴</h1>
          <p className="text-sm text-gray-500 mt-1">
            매일 아침 서치콘솔·자동완성·커뮤니티·클러스터 갭에서 글감을 긁어와 점수순으로 쌓습니다.
            채택하면 취재 골격이 붙은 채로 <Link href="/admin/ideas" className="text-blue-500 hover:underline">아이디어</Link>로 넘어갑니다 — 경험은 직접 채우세요.
          </p>
        </div>
        <CandidatesManager
          initial={candidates}
          runs={runs}
          clusters={clusters.map((c) => ({ key: c.key, emoji: c.emoji, label: c.nav_label || c.title }))}
        />
      </main>
    </div>
  )
}
