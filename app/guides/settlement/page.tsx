import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostsByCluster } from '@/lib/posts'
import { getClusterByKey } from '@/lib/clusters'
import type { Post } from '@/types'

export const revalidate = 3600

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'
const cluster = getClusterByKey('settlement')!

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: cluster.title,
    description: cluster.metaDescription,
    alternates: { canonical: `${siteUrl}/guides/settlement` },
    openGraph: {
      title: cluster.title,
      description: cluster.metaDescription,
      url: `${siteUrl}/guides/settlement`,
      type: 'website',
    },
  }
}

function PostRow({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex gap-4 items-start py-3">
      {post.cover_image ? (
        <img src={post.cover_image} alt={post.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-lg text-gray-300">📝</div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug mb-1 line-clamp-2">{post.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
      </div>
    </Link>
  )
}

export default async function SettlementGuidePage() {
  if (!cluster) notFound()

  const posts = await getPostsByCluster('settlement').catch(() => [])
  const bySlug = new Map(posts.map((p) => [p.slug, p]))

  // 섹션에 배치된 글과, 아직 어느 섹션에도 없는 글(그 외)로 나눈다.
  const placedSlugs = new Set(cluster.sections.flatMap((s) => s.slugs))
  const leftover = posts.filter((p) => !placedSlugs.has(p.slug))

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cluster.title,
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/blog/${p.slug}`,
      name: p.title,
    })),
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link href="/blog" className="hover:text-gray-600">블로그</Link>
        <span>·</span>
        <span className="text-gray-500">가이드</span>
      </div>

      <header className="mb-10">
        <div className="text-4xl mb-3">{cluster.emoji}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">{cluster.title}</h1>
        <p className="text-gray-500 leading-relaxed">{cluster.tagline}</p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">아직 정리된 글이 없습니다.</div>
      ) : (
        <div className="space-y-10">
          {cluster.sections.map((section) => {
            const items = section.slugs.map((s) => bySlug.get(s)).filter((p): p is Post => !!p)
            if (items.length === 0) return null
            return (
              <section key={section.title}>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 mb-2">
                  {section.title}
                </h2>
                <div className="divide-y divide-gray-50">
                  {items.map((p) => <PostRow key={p.id} post={p} />)}
                </div>
              </section>
            )
          })}

          {leftover.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 mb-2">
                📌 그 외 정착 실무
              </h2>
              <div className="divide-y divide-gray-50">
                {leftover.map((p) => <PostRow key={p.id} post={p} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-14 pt-8 border-t border-gray-100">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← 모든 글 보기
        </Link>
      </div>
    </div>
  )
}
