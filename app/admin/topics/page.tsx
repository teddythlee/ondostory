export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getGscInsights, type GscRow } from '@/lib/gsc'
import AdminLogoutButton from '../LogoutButton'

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}
function pathOf(url: string) {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function MetricRow({ label, row, href }: { label: string; row: GscRow; href?: string }) {
  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3">
        {href ? (
          <a href={href} target="_blank" className="text-sm text-gray-900 hover:text-blue-600 line-clamp-1">{label}</a>
        ) : (
          <span className="text-sm text-gray-900 line-clamp-1">{label}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-500 whitespace-nowrap">{row.clicks}</td>
      <td className="px-4 py-3 text-right text-sm text-gray-500 whitespace-nowrap">{row.impressions}</td>
      <td className="px-4 py-3 text-right text-sm text-gray-500 whitespace-nowrap">{pct(row.ctr)}</td>
      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 whitespace-nowrap">{row.position.toFixed(1)}</td>
    </tr>
  )
}

function Table({ title, hint, rows, asPage }: { title: string; hint: string; rows: GscRow[]; asPage?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-sm text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">해당하는 데이터가 아직 없어요.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-right">
              <th className="px-4 py-2 text-xs font-medium text-gray-400 text-left">{asPage ? '페이지' : '검색어'}</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-400">클릭</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-400">노출</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-400">CTR</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-400">순위</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <MetricRow
                key={i}
                row={r}
                label={asPage ? pathOf(r.keys[0]) : r.keys[0]}
                href={asPage ? r.keys[0] : undefined}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default async function TopicsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const gsc = await getGscInsights()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold text-gray-900">ondostory</Link>
            <span className="text-gray-300">·</span>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">관리자</Link>
            <span className="text-gray-300">›</span>
            <span className="text-sm text-gray-700">주제 발굴</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">← 전체 목록</Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">주제 발굴 · Search Console</h1>
          <p className="text-sm text-gray-500 mt-1">
            {gsc.range.startDate} ~ {gsc.range.endDate} 검색 성과 기준. 지금 밀면 효율 좋은 기회를 모았어요.
          </p>
        </div>

        {!gsc.configured ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
            GSC 서비스 계정 키(GOOGLE_SERVICE_ACCOUNT_KEY)가 런타임에 없어요. Worker 시크릿 설정을 확인하세요.
          </div>
        ) : gsc.error ? (
          <div className="bg-white rounded-xl border border-red-200 p-6 text-sm text-red-600">
            GSC 조회 오류: {gsc.error}
          </div>
        ) : (
          <>
            <Table
              title="🎯 기회 검색어 (8~20위 · 밀면 1페이지)"
              hint="이미 노출되는데 페이지 1~2 경계에 걸린 검색어. 관련 글의 제목·본문을 이 키워드로 보강하면 순위가 오르기 쉬워요."
              rows={gsc.opportunities}
            />
            <Table
              title="✏️ 제목·메타 개선 후보 (노출↑ CTR↓)"
              hint="노출은 되는데 클릭이 약한 페이지. 제목/요약(메타)을 더 끌리게 고치면 클릭이 늘어요."
              rows={gsc.lowCtrPages}
              asPage
            />
            <Table
              title="📊 노출 상위 검색어 (참고)"
              hint="사람들이 온도스토리를 어떤 검색어로 만나는지. 새 글·클러스터 방향 참고용."
              rows={gsc.topQueries}
            />
          </>
        )}
      </main>
    </div>
  )
}
