'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Post } from '@/types'

type View = 'grid' | 'list'

export default function PostList({ posts }: { posts: Post[] }) {
  const [view, setView] = useState<View>('grid')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    posts.forEach(p => p.tags.forEach(t => set.add(t)))
    return Array.from(set)
  }, [posts])

  const filtered = useMemo(() =>
    activeTag ? posts.filter(p => p.tags.includes(activeTag)) : posts,
    [posts, activeTag]
  )

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        {/* Tag filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-sm px-3 py-1 rounded-full transition-colors ${!activeTag ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            전체
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${activeTag === tag ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('grid')}
            title="그리드 보기"
            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            title="리스트 보기"
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
              <rect x="1" y="12" width="14" height="2" rx="1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-400 mb-6">{filtered.length}개의 글</p>

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-400">해당 태그의 글이 없습니다.</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col">
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title} className="w-full h-44 object-cover rounded-xl mb-4" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center text-3xl text-gray-300">
                  📝
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {post.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{tag}</span>
                ))}
              </div>
              <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2 leading-snug">
                {post.title}
              </h2>
              <p className="text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>
              {post.published_at && (
                <p className="text-xs text-gray-400 mt-3">
                  {format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}
                </p>
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
                <div className="w-28 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex-shrink-0 flex items-center justify-center text-xl text-gray-300">
                  📝
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{tag}</span>
                  ))}
                  {post.published_at && (
                    <span className="text-xs text-gray-400">
                      {format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}
                    </span>
                  )}
                </div>
                <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1 line-clamp-1 leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
