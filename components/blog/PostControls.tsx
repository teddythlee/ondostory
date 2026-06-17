'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type View = 'grid' | 'list'

interface Props {
  allTags: string[]
  allCategories: string[]
  activeTag: string | null
  activeCategory: string | null
  initialQ: string
  view: View
}

export default function PostControls({
  allTags,
  allCategories,
  activeTag,
  activeCategory,
  initialQ,
  view,
}: Props) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(!!initialQ)
  const [filterOpen, setFilterOpen] = useState(!!(activeTag || activeCategory))
  const [search, setSearch] = useState(initialQ)
  const searchRef = useRef<HTMLInputElement>(null)

  function buildUrl(overrides: {
    tag?: string | null
    category?: string | null
    q?: string | null
    view?: string
  }) {
    const params = new URLSearchParams()
    const t = overrides.tag !== undefined ? overrides.tag : activeTag
    const c = overrides.category !== undefined ? overrides.category : activeCategory
    const q = overrides.q !== undefined ? overrides.q : search.trim()
    const v = overrides.view !== undefined ? overrides.view : view
    if (t) params.set('tag', t)
    if (c) params.set('category', c)
    if (q) params.set('q', q)
    if (v && v !== 'grid') params.set('view', v)
    const qs = params.toString()
    return `/blog${qs ? `?${qs}` : ''}`
  }

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const t = setTimeout(() => {
      router.push(buildUrl({ q: search.trim() || null }), { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const hasActiveFilter = !!(activeTag || activeCategory)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">블로그</h1>
        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <button
            onClick={() => {
              setSearchOpen(v => !v)
              if (searchOpen) {
                setSearch('')
                router.push(buildUrl({ q: null }), { scroll: false })
              }
            }}
            className={`p-2 rounded-lg transition-colors ${searchOpen ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            title="검색"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>

          {/* Filter toggle */}
          {(allTags.length > 0 || allCategories.length > 0) && (
            <button
              onClick={() => setFilterOpen(v => !v)}
              className={`p-2 rounded-lg transition-colors relative ${filterOpen ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
              title="필터"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {hasActiveFilter && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1 ml-1">
            <button
              onClick={() => router.push(buildUrl({ view: 'grid' }), { scroll: false })}
              title="그리드 보기"
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => router.push(buildUrl({ view: 'list' }), { scroll: false })}
              title="리스트 보기"
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
                <rect x="1" y="12" width="14" height="2" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="relative mt-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="글 제목 또는 내용 검색..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-200 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Filter panel */}
      {filterOpen && (
        <div className="mt-4 p-3 bg-gray-50 rounded-xl space-y-2.5">
          {allCategories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 w-12 shrink-0">카테고리</span>
              <button
                onClick={() => router.push(buildUrl({ category: null }), { scroll: false })}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${!activeCategory ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >전체</button>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => router.push(buildUrl({ category: activeCategory === cat ? null : cat }), { scroll: false })}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >{cat}</button>
              ))}
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 w-12 shrink-0">태그</span>
              {allTags.map(t => (
                <button
                  key={t}
                  onClick={() => router.push(buildUrl({ tag: activeTag === t ? null : t }), { scroll: false })}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${activeTag === t ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >{t}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
