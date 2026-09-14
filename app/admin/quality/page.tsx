export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { getPagesAdminMeta } from '@/lib/posts'
import { getQualityDashboard } from '@/lib/quality-system'
import AdminLogoutButton from '../LogoutButton'
import QualityScanButton from './QualityScanButton'
import QualityDashboard from './QualityDashboard'

const REQUIRED_TRUST_PAGES = ['about', 'contact', 'privacy-policy', 'terms', 'disclaimer']

export default async function QualityPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const [dashboardResult, pages] = await Promise.all([
    getQualityDashboard().then((data) => ({ data, error: '' })).catch((error) => ({
      data: { latestRun: null, previousRun: null, rows: [] },
      error: error instanceof Error ? error.message : '품질 데이터를 읽지 못했습니다.',
    })),
    getPagesAdminMeta().catch(() => []),
  ])
  const { latestRun, rows } = dashboardResult.data
  const publishedTrustPages = new Set(pages.filter((page) => page.status === 'published' && page.content_chars >= 300).map((page) => page.slug))
  const missingTrustPages = REQUIRED_TRUST_PAGES.filter((slug) => !publishedTrustPages.has(slug))
  const resolved = rows.filter((row) => row.work?.state === 'resolved').length
  const monitoring = rows.filter((row) => row.work?.state === 'monitoring').length
  const latestLabel = latestRun?.completed_at
    ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles' }).format(new Date(latestRun.completed_at))
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← 관리자</Link>
            <span className="text-gray-300">·</span>
            <span className="text-sm font-medium text-gray-700">콘텐츠 품질</span>
          </div>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">AdSense 승인 준비</p>
            <h1 className="text-2xl font-bold text-gray-900">콘텐츠 품질 운영</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
              본문의 경험성·구체성·중복 위험을 점검하고, GSC·GA4는 보강 순서를 정하는 데만 사용합니다. 이 점수는 Google의 판정이나 승인 보장이 아닙니다.
            </p>
          </div>
          <QualityScanButton hasRun={!!latestRun} />
        </div>

        {dashboardResult.error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            품질 시스템 DB 준비가 필요합니다: {dashboardResult.error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi label="위험" value={latestRun?.critical_count ?? 0} color="text-red-600" />
          <Kpi label="점검" value={latestRun?.watch_count ?? 0} color="text-amber-600" />
          <Kpi label="자동 점검 통과" value={latestRun?.healthy_count ?? 0} color="text-green-600" />
          <Kpi label="성과 관찰" value={monitoring} color="text-blue-600" />
          <Kpi label="해결됨" value={resolved} color="text-gray-900" />
        </div>

        <section className={`rounded-xl border p-5 ${missingTrustPages.length === 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-semibold text-gray-900">사이트 신뢰 페이지</h2>
              <p className="text-sm text-gray-600 mt-1">
                {missingTrustPages.length === 0
                  ? '소개·연락처·개인정보·약관·면책 페이지가 모두 발행되어 있습니다.'
                  : `확인 필요: ${missingTrustPages.join(', ')}`}
              </p>
            </div>
            <span className="text-xs text-gray-500">{publishedTrustPages.size}/{REQUIRED_TRUST_PAGES.length} 준비</span>
          </div>
        </section>

        {latestRun ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <span>최근 점검: {latestLabel} · {latestRun.source === 'scheduled' ? '주간 자동' : '수동'}</span>
              <span>수정 후 점수가 올라도 28일 성과 관찰을 거쳐 해결 처리하세요.</span>
            </div>
            <QualityDashboard initialRows={rows} />
          </>
        ) : !dashboardResult.error ? (
          <section className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
            <p className="font-medium text-gray-900">아직 품질 점검 기록이 없습니다.</p>
            <p className="text-sm text-gray-500 mt-2">첫 점검을 실행하면 전체 발행 글의 우선 보강 목록을 만듭니다.</p>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
