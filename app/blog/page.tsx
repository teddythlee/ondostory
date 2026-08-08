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

type PostMeta = Awaited<ReturnType<typeof getPublishedPosts>>[number]

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '온도스토리 | 미국 한인 생활 정보 — 정착·자녀교육·맛집·쇼핑 (오렌지카운티)',
    description:
      '오렌지카운티 기준으로 직접 겪고 정리한 미국 생활 실전 기록. 은행·렌트·서류 같은 정착 절차부터 자녀교육·맛집·쇼핑·근교 여행까지, 검색해도 흩어져 있던 정보를 한곳에.',
    alternates: { canonical: `${siteUrl}/blog` },
  }
}

/** 그리드 카드 — featured 행과 전체 격자에서 공용 */
function GridCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col">
      {post.cover_image ? (
        <img src={post.cover_image} alt={post.title} className="w-full h-44 object-cover rounded-xl mb-4" />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center text-3xl text-gray-300">📝</div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {post.category && <span className="text-[11px] text-blue-500 font-medium">{post.category}</span>}
        {post.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{t}</span>
        ))}
      </div>
      <h2 className="font-display text-xl text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2 leading-tight">{post.title}</h2>
      <p className="text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>
      {post.published_at && (
        <p className="text-xs text-gray-400 mt-3">{format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}</p>
      )}
    </Link>
  )
}

export default async function BlogPage({ searchParams }: Props) {
  const { tag, category, q, view = 'grid' } = await searchParams
  const allPosts = await getPublishedPosts().catch(() => [])

  const allTags = [...new Set(allPosts.flatMap((p) => p.tags))].sort()
  const allCategories = [...new Set(allPosts.map((p) => p.category).filter((c): c is string => !!c))].sort()

  let posts = allPosts
  if (category) posts = posts.filter((p) => p.category === category)
  if (tag) posts = posts.filter((p) => p.tags.includes(tag))
  if (q) {
    const lower = q.toLowerCase()
    posts = posts.filter(
      (p) => p.title.toLowerCase().includes(lower) || p.excerpt.toLowerCase().includes(lower)
    )
  }

  // 필터/검색이 없는 기본 화면에서만 "많이 읽는 글"을 앞세운다.
  const isDefault = !tag && !category && !q
  const popular = isDefault
    ? [...allPosts].filter((p) => p.view_count > 0).sort((a, b) => b.view_count - a.view_count).slice(0, 6)
    : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* 값-제안 헤더 — 처음 온 사람이 2초 안에 "여기가 뭐 하는 곳"인지 알게 */}
      <header className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl text-gray-900 leading-tight">
          미국 한인 생활 정보 · 오렌지카운티 정착 가이드
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-500 leading-relaxed">
          은행·렌트·서류 같은 정착 절차부터 자녀교육·맛집·쇼핑·근교 여행까지 — 직접 확인하고 정리한 실전 정보.
        </p>
      </header>

      <PostControls
        allTags={allTags}
        allCategories={allCategories}
        activeTag={tag ?? null}
        activeCategory={category ?? null}
        initialQ={q ?? ''}
        view={view === 'list' ? 'list' : 'grid'}
      />

      {/* 많이 읽는 글 — 검증된 인기글을 먼저 보여줘 진입점을 만든다 */}
      {isDefault && popular.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">🔥 많이 읽는 글</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {popular.map((post) => (
              <GridCard key={`pop-${post.id}`} post={post} />
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-gray-400 mb-6">{isDefault ? '전체 글' : `${posts.length}개의 글`}</p>

      {posts.length === 0 ? (
        <div className="text-center py-24 text-gray-400">검색 결과가 없습니다.</div>
      ) : view === 'list' ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex gap-4 sm:gap-5 rounded-2xl border border-gray-100 p-3 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="relative w-24 sm:w-28 aspect-[2/3] flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                {post.cover_image ? (
                  <img src={post.cover_image} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl text-gray-300">📝</div>
                )}
                {post.category && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/45 text-white backdrop-blur-sm">
                    {post.category}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col py-1">
                <h2 className="font-display text-lg sm:text-xl text-gray-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2 mb-1.5">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{post.excerpt}</p>
                <div className="mt-auto pt-2 flex items-center gap-1.5 font-hand text-base text-gray-400">
                  {post.published_at && <span>{format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}</span>}
                  {post.view_count > 0 && (<><span>·</span><span>조회 {post.view_count.toLocaleString()}</span></>)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <GridCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
