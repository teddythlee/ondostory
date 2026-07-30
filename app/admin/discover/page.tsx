export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getCandidates, getRecentRuns, getPublishedTitles } from '@/lib/candidates'
import { getClustersAdmin } from '@/lib/clusters'
import AdminLogoutButton from '../LogoutButton'
import CandidatesManager from './CandidatesManager'

// 후보 vs 발행글 중복 경고: 핵심 토큰(흔한 말 제외)이 2개 이상 겹치면 그 글을 연결한다.
const RELATED_STOP = new Set(['미국', '캘리포니아', '후기', '방법', '추천', '가격', '비용', '정리', '총정리'])
function relTokens(s: string): string[] {
  return (s || '')
    .replace(/\[[^\]]+\]/g, ' ')
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !RELATED_STOP.has(t))
}
function findRelatedPost(
  topic: string,
  query: string | null,
  posts: { slug: string; title: string }[]
): { slug: string; title: string } | null {
  const ct = relTokens(query || topic)
  if (ct.length === 0) return null
  let best: { slug: string; title: string } | null = null
  let bestN = 1
  for (const p of posts) {
    const title = p.title.toLowerCase()
    const n = ct.filter((t) => title.includes(t)).length
    if (n >= 2 && n > bestN) {
      bestN = n
      best = p
    }
  }
  return best
}

export default async function DiscoverPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const [candidates, runs, clusters, posts] = await Promise.all([
    getCandidates('new').catch(() => []),
    getRecentRuns(5).catch(() => []),
    getClustersAdmin().catch(() => []),
    getPublishedTitles().catch(() => []),
  ])

  const related: Record<string, { slug: string; title: string }> = {}
  for (const c of candidates) {
    const m = findRelatedPost(c.topic, c.query, posts)
    if (m) related[c.id] = m
  }

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
            매일 아침 서치콘솔·구글/네이버 자동완성·클러스터 갭에서 글감을 긁어와 점수순으로 쌓습니다.
            채택하면 취재 골격이 붙은 채로 <Link href="/admin/ideas" className="text-blue-500 hover:underline">아이디어</Link>로 넘어갑니다 — 경험은 직접 채우세요.
          </p>
        </div>
        <CandidatesManager
          initial={candidates}
          runs={runs}
          clusters={clusters.map((c) => ({ key: c.key, emoji: c.emoji, label: c.nav_label || c.title }))}
          related={related}
        />
      </main>
    </div>
  )
}
