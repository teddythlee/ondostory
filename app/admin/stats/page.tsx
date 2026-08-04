export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { getAllPostsAdminMeta } from '@/lib/posts'
import { getClustersAdmin } from '@/lib/clusters'
import { getGscInsights, getGscTrend, getDailyTrend, type DailyPoint } from '@/lib/gsc'
import AdminLogoutButton from '../LogoutButton'

const shortPath = (url: string) => url.replace(/^https?:\/\/(www\.)?ondostory\.com/, '') || '/'

export default async function StatsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const [posts, clusters, insights, trend, daily] = await Promise.all([
    getAllPostsAdminMeta().catch(() => []),
    getClustersAdmin().catch(() => []),
    getGscInsights().catch(() => null),
    getGscTrend().catch(() => null),
    getDailyTrend(60).catch(() => [] as DailyPoint[]),
  ])

  const published = posts.filter((p) => p.status === 'published')
  const views = (id: string) => published.find((p) => p.id === id)?.view_count ?? 0
  const totalViews = published.reduce((s, p) => s + (p.view_count ?? 0), 0)
  const avg = published.length ? Math.round(totalViews / published.length) : 0
  const unclustered = published.filter((p) => !p.cluster).length
  const top = [...published].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))

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

  const gscOn = insights?.configured && !insights?.error

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
        {/* ═══════════ GSC 검색 유입 (핵심) ═══════════ */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-gray-900 text-lg">🔍 검색 유입 (Google Search Console)</h2>
            <span className="text-xs text-gray-400">최근 28일 · 매일 자동 갱신</span>
          </div>

          {!gscOn ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
              GSC 데이터를 불러오지 못했어요. {insights?.error ? `(${insights.error})` : 'GOOGLE_SERVICE_ACCOUNT_KEY 설정을 확인하세요.'}
            </div>
          ) : (
            <>
              {/* KPI + 직전 대비 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GscKpi label="노출" cur={trend?.recent28.impressions ?? insights!.totals.impressions} prev={trend?.prev28.impressions} />
                <GscKpi label="클릭" cur={trend?.recent28.clicks ?? insights!.totals.clicks} prev={trend?.prev28.clicks} />
                <GscKpi label="CTR" cur={(trend?.recent28.ctr ?? insights!.totals.ctr) * 100} prev={trend ? trend.prev28.ctr * 100 : undefined} suffix="%" digits={1} />
                <GscKpi label="평균 순위" cur={trend?.recent28.position ?? insights!.totals.position} prev={trend?.prev28.position} digits={1} lowerBetter />
              </div>

              {/* 일별 추세 차트 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">날짜별 추세</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><i className="inline-block w-3 h-2 rounded-sm bg-blue-200" />노출</span>
                    <span className="flex items-center gap-1.5"><i className="inline-block w-3 h-0.5 bg-orange-500" />클릭</span>
                  </div>
                </div>
                <TrendChart data={daily} />
              </div>

              {/* 제목·메타 손질 후보 (노출 많은데 CTR 낮은 페이지) */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">📝 제목·메타 손질 후보</h3>
                  <p className="text-xs text-gray-400 mt-0.5">노출은 많은데 CTR이 낮은 페이지(≥50노출, CTR&lt;5%) — 제목/메타 바꾸면 클릭↑</p>
                </div>
                <MetricTable
                  cols={['페이지', '노출', '클릭', 'CTR', '순위']}
                  rows={(insights!.lowCtrPages || []).slice(0, 15).map((r) => [
                    shortPath(r.keys[0]),
                    r.impressions.toLocaleString(),
                    String(r.clicks),
                    `${(r.ctr * 100).toFixed(1)}%`,
                    r.position.toFixed(1),
                  ])}
                  empty="아직 없음 (노출 쌓이면 표시)"
                />
              </div>

              {/* 문턱 검색어 (순위 8~20위) */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">🚪 문턱 검색어 (순위 8~20위)</h3>
                  <p className="text-xs text-gray-400 mt-0.5">노출은 있는데 2페이지에 걸친 검색어 — 살짝만 밀면 1페이지 = 노출·클릭 급증</p>
                </div>
                <MetricTable
                  cols={['검색어', '노출', '클릭', 'CTR', '순위']}
                  rows={(insights!.opportunities || []).slice(0, 15).map((r) => [
                    r.keys[0],
                    r.impressions.toLocaleString(),
                    String(r.clicks),
                    `${(r.ctr * 100).toFixed(1)}%`,
                    r.position.toFixed(1),
                  ])}
                  empty="아직 없음"
                />
              </div>

              {/* 노출·클릭 top (검색어 → 페이지) */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">🔝 노출·클릭 상위 검색어</h3>
                  <p className="text-xs text-gray-400 mt-0.5">어떤 검색어가 어느 글로 유입되는지 (노출 순)</p>
                </div>
                <MetricTable
                  cols={['검색어', '페이지', '노출', '클릭', 'CTR', '순위']}
                  rows={(insights!.queryPages || []).slice(0, 20).map((r) => [
                    r.query,
                    shortPath(r.page),
                    r.impressions.toLocaleString(),
                    String(r.clicks),
                    `${(r.ctr * 100).toFixed(1)}%`,
                    r.position.toFixed(1),
                  ])}
                  empty="아직 없음"
                />
              </div>
            </>
          )}
        </section>

        <hr className="border-gray-200" />

        {/* ═══════════ 조회수 통계 (사이트 내부) ═══════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="총 조회수" value={totalViews.toLocaleString()} accent="text-gray-900" />
          <Kpi label="발행 글" value={String(published.length)} accent="text-green-600" />
          <Kpi label="글 평균 조회수" value={avg.toLocaleString()} accent="text-blue-600" />
          <Kpi label="미분류(클러스터 없음)" value={String(unclustered)} accent="text-yellow-500" />
        </div>

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
          ℹ️ 위 GSC 지표는 Google Search Console 최근 28일 기준(라이브)입니다. 날짜별 추세 차트는 매일
          자동 저장되는 gsc_daily에서 그립니다(처음엔 며칠 쌓여야 채워집니다). 아래 조회수는 본인(관리자
          로그인) 방문을 제외한 raw 페이지 로드 수입니다.
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

function GscKpi({
  label, cur, prev, suffix = '', digits = 0, lowerBetter = false,
}: {
  label: string; cur: number; prev?: number; suffix?: string; digits?: number; lowerBetter?: boolean
}) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
  let delta: { txt: string; good: boolean } | null = null
  if (prev !== undefined && prev > 0) {
    const diff = cur - prev
    const rel = Math.round((diff / prev) * 100)
    if (rel !== 0) {
      const good = lowerBetter ? diff < 0 : diff > 0
      delta = { txt: `${diff > 0 ? '▲' : '▼'} ${Math.abs(rel)}%`, good }
    }
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{fmt(cur)}{suffix}</p>
      {delta && (
        <p className={`text-xs mt-1 font-medium ${delta.good ? 'text-green-600' : 'text-red-500'}`}>
          {delta.txt} <span className="text-gray-400 font-normal">직전 28일 대비</span>
        </p>
      )}
    </div>
  )
}

function MetricTable({ cols, rows, empty }: { cols: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <div className="px-6 py-6 text-sm text-gray-400">{empty}</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            {cols.map((c, i) => (
              <th key={c} className={`px-4 py-2.5 ${i === 0 ? 'text-left pl-6' : 'text-right'}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, ri) => (
            <tr key={ri} className="hover:bg-gray-50">
              {r.map((cell, ci) => (
                <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? 'text-left pl-6 text-gray-800 max-w-[280px] truncate' : 'text-right text-gray-600 tabular-nums'}`} title={ci === 0 ? String(cell) : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TrendChart({ data }: { data: DailyPoint[] }) {
  if (data.length < 2) {
    return <div className="h-40 flex items-center justify-center text-sm text-gray-400">추세 데이터 수집 중 — 매일 자동으로 채워집니다.</div>
  }
  const W = 900, H = 180
  const pad = { l: 6, r: 6, t: 12, b: 22 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const maxImpr = Math.max(...data.map((d) => d.impressions), 1)
  const maxClk = Math.max(...data.map((d) => d.clicks), 1)
  const n = data.length
  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw)
  const yI = (v: number) => pad.t + (1 - v / maxImpr) * ih
  const yC = (v: number) => pad.t + (1 - v / maxClk) * ih

  const imprArea = `M ${x(0)} ${pad.t + ih} ` + data.map((d, i) => `L ${x(i).toFixed(1)} ${yI(d.impressions).toFixed(1)}`).join(' ') + ` L ${x(n - 1)} ${pad.t + ih} Z`
  const clkLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${yC(d.clicks).toFixed(1)}`).join(' ')
  const lbl = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`
  const ticks = [0, Math.floor(n / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }} preserveAspectRatio="none">
      <path d={imprArea} fill="rgb(191 219 254)" opacity={0.7} />
      <path d={clkLine} fill="none" stroke="rgb(249 115 22)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={yC(d.clicks)} r={2} fill="rgb(249 115 22)" />
      ))}
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize={11} fill="#9ca3af" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
          {lbl(data[i].day)}
        </text>
      ))}
    </svg>
  )
}
