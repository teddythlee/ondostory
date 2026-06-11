'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ToastType = 'error' | 'warning' | 'info'

interface Toast {
  message: string
  type: ToastType
}

const TOAST_ICONS: Record<ToastType, string> = {
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}

const TOAST_COLORS: Record<ToastType, string> = {
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
}

function getToastFromCode(code: string, message: string): Toast {
  if (code === 'invalid_credentials') return { message, type: 'error' }
  if (code === 'user_not_found') return { message, type: 'warning' }
  if (code === 'email_not_confirmed') return { message, type: 'warning' }
  if (code === 'no_permission') return { message, type: 'warning' }
  return { message, type: 'error' }
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setToast(null)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (res.ok) {
        window.location.href = '/admin'
      } else {
        setToast(getToastFromCode(data.code || '', data.error || '로그인 실패'))
        setLoading(false)
      }
    } catch {
      setToast({ message: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.', type: 'error' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${TOAST_COLORS[toast.type]}`}>
          <span>{TOAST_ICONS[toast.type]}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ondostory</h1>
          <p className="text-sm text-gray-500 mt-1">관리자 로그인</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@ondostory.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
