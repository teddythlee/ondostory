'use client'

import { useState, useCallback, useRef } from 'react'

interface UnsplashResult {
  id: string
  thumbUrl: string
  fullUrl: string
  alt: string
  credit: string
  creditUrl: string
}

interface Props {
  onInsert: (url: string, alt: string) => void
}

export default function ImageSearchPanel({ onInsert }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UnsplashResult[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string, p: number) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(q)}&page=${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '검색 실패')
      if (p === 1) setResults(data.results)
      else setResults((prev) => [...prev, ...data.results])
      setTotalPages(data.total_pages)
    } catch (e) {
      setError(e instanceof Error ? e.message : '검색 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setResults([])
    search(query, 1)
  }

  function handleMore() {
    const next = page + 1
    setPage(next)
    search(query, next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-semibold text-sm text-gray-700">무료 이미지 검색</h3>
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: nature, city..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          검색
        </button>
      </form>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {results.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onInsert(img.fullUrl, img.alt)}
                className="group relative aspect-video overflow-hidden rounded-lg border border-gray-100 hover:border-blue-400 transition-colors"
                title={`${img.alt} — by ${img.credit}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumbUrl} alt={img.alt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                  <span className="w-full text-[9px] text-white bg-black/50 px-1.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.credit}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {page < totalPages && (
            <button
              type="button"
              onClick={handleMore}
              disabled={loading}
              className="w-full text-xs text-gray-500 hover:text-gray-800 py-1 disabled:opacity-50"
            >
              {loading ? '불러오는 중...' : '더 보기'}
            </button>
          )}
          <p className="text-[10px] text-gray-400 text-center">
            Photos by{' '}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline">
              Pexels
            </a>
          </p>
        </div>
      )}

      {loading && results.length === 0 && (
        <div className="text-center py-4 text-xs text-gray-400">검색 중...</div>
      )}
    </div>
  )
}
