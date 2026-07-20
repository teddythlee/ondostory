'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SnapshotButton() {
  const router = useRouter()
  const [busy, setBusy] = useState<'recent' | 'backfill' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function run(mode: 'recent' | 'backfill') {
    setBusy(mode)
    setMsg(null)
    try {
      const res = await fetch(`/api/gsc/snapshot${mode === 'backfill' ? '?mode=backfill' : ''}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '실패')
      setMsg(`저장됨: ${data.inserted}행`)
      router.refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '실패')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
      <button
        onClick={() => run('backfill')}
        disabled={!!busy}
        className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        title="지난 13개월을 월별로 한 번에 저장 (최초 1회, 시즌/YoY 시작점)"
      >
        {busy === 'backfill' ? '백필 중…' : '지난 1년 백필'}
      </button>
      <button
        onClick={() => run('recent')}
        disabled={!!busy}
        className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
        title="최근 28일 스냅샷 저장 (주기적으로)"
      >
        {busy === 'recent' ? '저장 중…' : '스냅샷 저장'}
      </button>
    </div>
  )
}
