'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RetryButton({ postId }: { postId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function retry() {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/social/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg('게시됨 ✓')
        router.refresh()
      } else {
        setMsg(data.error || data.status || '실패')
      }
    } catch {
      setMsg('요청 오류')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={retry}
        disabled={busy}
        className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-100 disabled:opacity-40"
      >
        {busy ? '재시도 중…' : '재시도'}
      </button>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  )
}
