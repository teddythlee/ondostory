'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Post } from '@/types'

type View = 'grid' | 'list'

export default function PostList({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [view, setView] = useState<View>('grid')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const searchRef = useRef<HTMLInputElement>(null)

  const activeTag = searchParams.get('tag') || null
  const activeCategory = searchParams.get('category') || null

  const allTags = useMemo(() => {
    const set = new Set<string>()
    posts.forEach(p => p.tags.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [posts])

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    posts.forEach(p => { if (p.category) set.add(p.category) })
    return Array.from(set).sort()
  }, [posts])

  const filtered = useMemo(() => {
    let result = posts
    if (activeCategory) result = result.filter(p => p.category === activeCategory)
    if (activeTag) result = result.filter(p => p.tags.includes(activeTag))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)
      )
    }
    return result
  }, [posts, activeTag, activeCategory, search])

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/blog?${params.toString()}`, { scroll: false })
  }

  function toggleTag(tag: string) {
    setParam('tag', activeTag === tag ? null : tag)
  }

  function toggleCategory(cat: string) {
    setParam('category', activeCategory === cat ? null : cat)
  }

  // open search when ?q= exists in URL
  useEffect(() => {
    if (searchParams.get('q')) setSearchOpen(true)
    if (searchParams.get('tag') || searchParams.get('category')) setFilterOpen(true)
  }, [])

  // focus input when search opens
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  // debounce search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (search.trim()) params.set('q', search.trim())
      else params.delete('q')
      router.push(`/blog?${params.toString()}`, { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const hasActiveFilter = !!(activeTag || activeCategory)

  return (
    <div>
      {/* Title row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">블로그</h1>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <button
            onClick={() => {
              setSearchOpen(v => !v)
              if (searchOpen) { setSearch(''); setParam('q', null) }
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
              onClick={() => setView('grid')}
              title="그리드 보기"
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
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

      {/* Search bar (collapsible) */}
      {searchOpen && (
        <div className="relative mb-4">
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

      {/* Filter panel (collapsible) */}
      {filterOpen && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-2.5">
          {allCategories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 w-12 shrink-0">카테고리</span>
              <button
                onClick={() => setParam('category', null)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${!activeCategory ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >전체</button>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >{cat}</button>
              ))}
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 w-12 shrink-0">태그</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${activeTag === tag ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >{tag}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-gray-400 mb-6">{filtered.length}개의 글</p>

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-400">검색 결과가 없습니다.</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col">
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title} className="w-full h-44 object-cover rounded-xl mb-4" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center text-3xl text-gray-300">📝</div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {post.category && (
                  <span className="text-[11px] text-blue-500 font-medium">{post.category}</span>
                )}
                {post.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{tag}</span>
                ))}
              </div>
              <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2 leading-snug">{post.title}</h2>
              <p className="text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>
              {post.published_at && (
                <p className="text-xs text-gray-400 mt-3">{format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group flex gap-5 items-start">
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title} className="w-28 h-20 object-cover rounded-xl flex-shrink-0" />
              ) : (
                <div className="w-28 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex-shrink-0 flex items-center justify-center text-xl text-gray-300">📝</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  {post.category && <span className="text-[11px] text-blue-500 font-medium">{post.category}</span>}
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{tag}</span>
                  ))}
                  {post.published_at && (
                    <span className="text-xs text-gray-400">{format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}</span>
                  )}
                </div>
                <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1 line-clamp-1 leading-snug">{post.title}</h2>
                <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
