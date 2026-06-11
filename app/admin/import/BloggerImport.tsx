'use client'

import { useRef, useState } from 'react'
import type { BloggerPost } from '@/app/api/import/blogger/route'

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'done'

export default function BloggerImport() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [posts, setPosts] = useState<BloggerPost[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [results, setResults] = useState<{ ok: number; fail: number }>({ ok: 0, fail: 0 })
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    setStatus('parsing')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/import/blogger', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setStatus('idle'); return }
    setPosts(data.posts)
    setSelected(new Set(data.posts.map((_: BloggerPost, i: number) => i)))
    setStatus('preview')
  }

  function toggleAll() {
    if (selected.size === posts.length) setSelected(new Set())
    else setSelected(new Set(posts.map((_, i) => i)))
  }

  function toggle(i: number) {
    const next = new Set(selected)
    next.has(i) ? next.delete(i) : next.add(i)
    setSelected(next)
  }

  async function handleImport() {
    setStatus('importing')
    let ok = 0, fail = 0
    const toImport = posts.filter((_, i) => selected.has(i))

    for (const post of toImport) {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      })
      if (res.ok) ok++; else fail++
    }

    setResults({ ok, fail })
    setStatus('done')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Blogger XML 가져오기</h2>
        <p className="text-sm text-gray-500 mb-5">Blogger 대시보드 → 설정 → 콘텐츠 백업에서 내보낸 <code className="bg-gray-100 px-1 rounded">feed.atom</code> 파일을 업로드하세요.</p>

        {status === 'idle' && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <input ref={fileRef} type="file" accept=".atom,.xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <p className="text-3xl mb-3">📥</p>
            <p className="text-sm text-gray-500">클릭해서 feed.atom 파일 선택</p>
          </div>
        )}

        {status === 'parsing' && (
          <div className="text-center py-12 text-gray-400 text-sm">파일 파싱 중...</div>
        )}

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      </div>

      {status === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900">총 {posts.length}개 포스트 발견</span>
              <span className="text-sm text-gray-400 ml-2">{selected.size}개 선택됨</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="text-sm text-gray-500 hover:text-gray-900">
                {selected.size === posts.length ? '전체 해제' : '전체 선택'}
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                선택한 {selected.size}개 가져오기
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {posts.map((post, i) => (
              <label key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-1 rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 line-clamp-1">{post.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{post.excerpt}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${post.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {post.published ? '발행' : '임시저장'}
                    </span>
                    {post.published_at && (
                      <span className="text-xs text-gray-400">{post.published_at.slice(0, 10)}</span>
                    )}
                    {post.tags.map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {status === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          가져오는 중... ({selected.size}개)
        </div>
      )}

      {status === 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="font-semibold text-gray-900 mb-1">가져오기 완료</p>
          <p className="text-sm text-gray-500">성공 {results.ok}개 · 실패 {results.fail}개</p>
          <a href="/admin" className="inline-block mt-5 text-sm text-blue-500 hover:underline">관리자 페이지로 →</a>
        </div>
      )}
    </div>
  )
}
