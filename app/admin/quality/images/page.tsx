export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { getImageAudit } from '@/lib/image-provenance'
import ImageAuditDashboard from './ImageAuditDashboard'

export default async function ImageAuditPage() {
  if (!(await getAdminSession())) redirect('/admin/login')
  const result = await getImageAudit()
    .then((items) => ({ items, error: '' }))
    .catch((error) => ({ items: [], error: error instanceof Error ? error.message : '이미지 자산대장을 읽지 못했습니다.' }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/quality" className="text-sm text-gray-500 hover:text-gray-900">← 콘텐츠 품질</Link>
          <span className="text-gray-300">·</span>
          <span className="text-sm font-medium text-gray-700">이미지 자산대장</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <p className="text-xs font-semibold text-purple-600 mb-1">AdSense 위험 관리</p>
          <h1 className="text-2xl font-bold text-gray-900">이미지 출처·사용권 감사</h1>
          <p className="text-sm text-gray-500 mt-2">URL이나 육안으로 소유권을 추측하지 않습니다. 증빙이 있는 경우에만 검증 완료로 바꿀 수 있습니다.</p>
        </div>
        {result.error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{result.error}</div>
        ) : <ImageAuditDashboard initialItems={result.items} />}
      </main>
    </div>
  )
}
