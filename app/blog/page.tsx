import { getPublishedPosts } from '@/lib/posts'
import PostControls from '@/components/blog/PostControls'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Metadata } from 'next'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'

interface Props {
  searchParams: Promise<{ tag?: string; category?: string; q?: string; view?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'ondostory 블로그 - 온도이야기',
    description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
    alternates: { canonical: `${siteUrl}/blog` },
  }
}

export default async function BlogPage({ searchParams }: Props) {
  const { tag, category, q, view = 'grid' } = await searchParams
  const allPosts = await getPublishedPosts().catch(() => [])

  const allTags = [...new Set(allPosts.flatMap(p => p.tags))].sort()
  const allCategories = [...new Set(allPosts.map(p => p.category).filter((c): c is string => !!c))].sort()

  let posts = allPosts
  if (category) posts = posts.filter(p => p.category === category)
  if (tag) posts = posts.filter(p => p.tags.includes(tag))
  if (q) {
    const lower = q.toLowerCase()
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(lower) || p.excerpt.toLowerCase().includes(lower)
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <PostControls
        allTags={allTags}
        allCategories={allCategories}
        activeTag={tag ?? null}
        activeCategory={category ?? null}
        initialQ={q ?? ''}
        view={(view === 'list' ? 'list' : 'grid')}
      />

      <p className="text-sm text-gray-400 mb-6">{posts.length}개의 글</p>

      {posts.length === 0 ? (
        <div className="text-center py-24 text-gray-400">검색 결과가 없습니다.</div>
      ) : view === 'list' ? (
        <div className="space-y-6">
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group flex gap-5 items-start">
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title} className="w-28 h-20 object-cover rounded-xl flex-shrink-0" />
              ) : (
                <div className="w-28 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex-shrink-0 flex items-center justify-center text-xl text-gray-300">📝</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  {post.category && <span className="text-[11px] text-blue-500 font-medium">{post.category}</span>}
                  {post.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{t}</span>
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
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
                {post.tags.slice(0, 2).map(t => (
                  <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{t}</span>
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
      )}
    </div>
  )
}
