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

/** 아카이브 격자 카드 (평면) */
function GridCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col">
      <div className="relative w-full h-44 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-gray-100 to-gray-200">
        {post.cover_image ? (
          <img src={post.cover_image} alt={post.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-gray-300">📝</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {post.category && <span className="text-[11px] text-blue-500 font-medium">{post.category}</span>}
        {post.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{t}</span>
        ))}
      </div>
      <h2 className="font-display text-xl text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2 leading-tight">{post.title}</h2>
      <p className="text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>
      <div className="mt-3 flex items-center justify-between">
        {post.published_at ? (
          <p className="text-xs text-gray-400">{format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}</p>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          읽어보기 <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
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

  const isDefault = !tag && !category && !q

  // 스포트라이트: 조회수 상위에서 클러스터가 겹치지 않게 3개.
  // 1등 편중·정체를 피하고 서로 다른 주제로 다양한 관심사를 커버한다.
  const spotlight: PostMeta[] = []
  if (isDefault) {
    const seen = new Set<string>()
    for (const p of [...allPosts].filter((p) => p.view_count > 0).sort((a, b) => b.view_count - a.view_count)) {
      const key = p.cluster ?? `id:${p.id}`
      if (seen.has(key)) continue
      seen.add(key)
      spotlight.push(p)
      if (spotlight.length >= 3) break
    }
  }

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

      {/* 스포트라이트 — 조회수 상위 3개(클러스터 분산). elevated 흰 카드로 아래 격자와 구분 */}
      {isDefault && spotlight.length > 0 && (
        <section className="mb-14 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 sm:p-7">
          <h2 className="font-display text-lg text-gray-900 mb-5 flex items-center gap-2">
            <span aria-hidden>🔥</span> 많이 읽는 글
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {spotlight.map((post) => (
              <Link
                key={`sp-${post.id}`}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200">
                  {post.cover_image ? (
                    <img src={post.cover_image} alt={post.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl text-gray-300">📝</div>
                  )}
                  {post.category && (
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">{post.category}</span>
                  )}
                </div>
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="font-display text-base sm:text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 flex-1 leading-relaxed">{post.excerpt}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    {post.view_count > 0 ? (
                      <span className="text-xs text-gray-400">조회 {post.view_count.toLocaleString()}</span>
                    ) : (
                      <span />
                    )}
                    <span className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      읽어보기 <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="font-display text-lg text-gray-900 mb-5">{isDefault ? '전체 글' : `${posts.length}개의 글`}</h2>

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
                  <img src={post.cover_image} alt={post.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
