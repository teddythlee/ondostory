export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getAllPostsAdminMeta } from '@/lib/posts'
import { getClustersAdmin } from '@/lib/clusters'
import AdminLogoutButton from '../LogoutButton'

export default async function StatsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const [posts, clusters] = await Promise.all([
    getAllPostsAdminMeta().catch(() => []),
    getClustersAdmin().catch(() => []),
  ])

  const published = posts.filter((p) => p.status === 'published')
  const views = (id: string) => published.find((p) => p.id === id)?.view_count ?? 0
  const totalViews = published.reduce((s, p) => s + (p.view_count ?? 0), 0)
  const avg = published.length ? Math.round(totalViews / published.length) : 0
  const unclustered = published.filter((p) => !p.cluster).length

  const top = [...published].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))

  // 클러스터별 집계
  const clusterMap = new Map(clusters.map((c) => [c.key, c]))
  const byClusterAgg = new Map<string, { views: number; count: number }>()
  for (const p of published) {
    const key = p.cluster ?? '__none__'
    const cur = byClusterAgg.get(key) ?? { views: 0, count: 0 }
    cur.views += p.view_count ?? 0
    cur.count += 1
    byClusterAgg.set(key, cur)
  }
  const clusterRows = [...byClusterAgg.entries()]
    .map(([key, v]) => ({
      key,
      label: key === '__none__' ? '— 미분류 —' : `${clusterMap.get(key)?.emoji ?? ''} ${clusterMap.get(key)?.title ?? key}`,
      ...v,
    }))
    .sort((a, b) => b.views - a.views)

  // 카테고리별 집계
  const byCatAgg = new Map<string, { views: number; count: number }>()
  for (const p of published) {
    const key = p.category ?? '— 없음 —'
    const cur = byCatAgg.get(key) ?? { views: 0, count: 0 }
    cur.views += p.view_count ?? 0
    cur.count += 1
    byCatAgg.set(key, cur)
  }
  const catRows = [...byCatAgg.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.views - a.views)

  const pct = (v: number) => (totalViews ? Math.round((v / totalViews) * 100) : 0)
  const barBg = 'linear-gradient(90deg, rgb(219 234 254) var(--w), transparent var(--w))'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← 관리자</Link>
            <span className="text-gray-300">·</span>
            <span className="text-sm font-medium text-gray-700">통계</span>
          </div>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="총 조회수" value={totalViews.toLocaleString()} accent="text-gray-900" />
          <Kpi label="발행 글" value={String(published.length)} accent="text-green-600" />
          <Kpi label="글 평균 조회수" value={avg.toLocaleString()} accent="text-blue-600" />
          <Kpi label="미분류(클러스터 없음)" value={String(unclustered)} accent="text-yellow-500" />
        </div>

        {/* 클러스터별 */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">클러스터별 조회수</h2>
            <p className="text-xs text-gray-400 mt-0.5">어떤 주제(가이드)가 트래픽을 끌고 있는지</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-2.5 text-left">클러스터</th>
                <th className="px-4 py-2.5 text-right w-24">글 수</th>
                <th className="px-4 py-2.5 text-right w-28">조회수</th>
                <th className="px-4 py-2.5 text-right w-20">비중</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clusterRows.map((r) => (
                <tr key={r.key} style={{ '--w': `${pct(r.views)}%`, background: barBg } as React.CSSProperties}>
                  <td className="px-6 py-3 text-gray-800">{r.label}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.count}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{r.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{pct(r.views)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 인기 글 */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">인기 글 (조회수 순)</h2>
          </div>
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-2.5 text-left w-10">#</th>
                <th className="px-4 py-2.5 text-left">제목</th>
                <th className="px-4 py-2.5 text-left w-40">클러스터</th>
                <th className="px-4 py-2.5 text-right w-24">조회수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {top.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/posts/${p.id}`} className="text-gray-800 hover:text-blue-600 line-clamp-1 block">{p.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 truncate">
                    {p.cluster ? `${clusterMap.get(p.cluster)?.emoji ?? ''} ${clusterMap.get(p.cluster)?.title ?? p.cluster}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{views(p.id).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 카테고리별 */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">카테고리별 조회수</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-2.5 text-left">카테고리</th>
                <th className="px-4 py-2.5 text-right w-24">글 수</th>
                <th className="px-4 py-2.5 text-right w-28">조회수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {catRows.map((r) => (
                <tr key={r.label} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-800">{r.label}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.count}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{r.views.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="text-xs text-gray-400 leading-relaxed">
          ℹ️ 조회수는 본인(관리자 로그인) 방문을 제외한 raw 페이지 로드 수입니다. 노출수·검색순위·검색어 등
          실제 검색 유입 지표는 Google Search Console에서 확인하세요. 유입 출처(커뮤니티 vs 검색)와
          날짜별 추세는 추가 구현이 필요합니다.
        </p>
      </main>
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}
