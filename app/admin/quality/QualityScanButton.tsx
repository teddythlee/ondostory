'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function QualityScanButton({ hasRun }: { hasRun: boolean }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setRunning(true)
    setError('')
    try {
      const res = await fetch('/api/quality/scan', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || '점검 실행 실패')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '점검 실행 실패')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-600 max-w-72">{error}</span>}
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {running ? '본문·GSC·GA4 분석 중…' : hasRun ? '지금 다시 점검' : '첫 품질 점검 실행'}
      </button>
    </div>
  )
}
