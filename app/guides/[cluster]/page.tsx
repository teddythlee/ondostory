import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getClusterByKey } from '@/lib/clusters'
import { getPostsByCluster } from '@/lib/posts'
import type { PostMeta } from '@/types'
import TrackedLink from '@/components/analytics/TrackedLink'
import { GUIDE_PHASES, getGuidePhase, orderGuidePosts } from '@/lib/post-navigation'

// 클러스터 변경이 즉시 반영되도록 동적 렌더(저트래픽 허브라 비용 무시).
export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'

interface Props {
  params: Promise<{ cluster: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cluster: key } = await params
  const cluster = await getClusterByKey(key)
  if (!cluster) return {}

  const url = `${siteUrl}/guides/${cluster.key}`
  return {
    title: cluster.title,
    description: cluster.meta_description || cluster.tagline,
    alternates: { canonical: url },
    openGraph: {
      title: cluster.title,
      description: cluster.meta_description || cluster.tagline,
      url,
      type: 'website',
    },
  }
}

function PostRow({ post, clusterKey, position }: { post: PostMeta; clusterKey: string; position: number }) {
  return (
    <TrackedLink
      href={`/blog/${post.slug}`}
      eventName="internal_recommendation_click"
      eventParams={{
        source_page: `guide:${clusterKey}`,
        target_slug: post.slug,
        link_location: 'guide_sequence',
        recommendation_position: position,
      }}
      className="group flex gap-4 items-start rounded-xl p-3 -mx-3 hover:bg-white hover:shadow-sm transition-all"
    >
      {post.cover_image ? (
        <img src={post.cover_image} alt={post.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-lg text-gray-300">📝</div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug mb-1 line-clamp-2">{post.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
          이 단계 읽기 <span aria-hidden>→</span>
        </span>
      </div>
    </TrackedLink>
  )
}

export default async function ClusterHubPage({ params }: Props) {
  const { cluster: key } = await params
  const cluster = await getClusterByKey(key)
  if (!cluster) notFound()

  const posts = orderGuidePosts(await getPostsByCluster(cluster.key).catch(() => []))
  const phaseGroups = GUIDE_PHASES
    .map((phase) => ({ ...phase, posts: posts.filter((post) => getGuidePhase(post) === phase.key) }))
    .filter((phase) => phase.posts.length > 0)

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
        <Link href="/guides" className="hover:text-gray-600">가이드</Link>
      </div>

      <header className="mb-10">
        <div className="text-4xl mb-3">{cluster.emoji}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">{cluster.title}</h1>
        {cluster.tagline && <p className="text-gray-500 leading-relaxed">{cluster.tagline}</p>}
        {posts.length > 0 && (
          <p className="mt-4 text-sm text-blue-600 font-medium">
            위에서부터 읽으면 전체 흐름을 놓치지 않습니다 · 총 {posts.length}개
          </p>
        )}
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">아직 정리된 글이 없습니다.</div>
      ) : (
        <div className="space-y-10">
          {phaseGroups.map((phase, phaseIndex) => (
            <section key={phase.key} aria-labelledby={`phase-${phase.key}`}>
              <div className="mb-3">
                <p className="text-xs font-semibold text-blue-500">{phaseIndex + 1}단계</p>
                <h2 id={`phase-${phase.key}`} className="font-display text-xl text-gray-900">{phase.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{phase.description}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 divide-y divide-gray-100">
                {phase.posts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    clusterKey={cluster.key}
                    position={posts.findIndex((item) => item.id === post.id) + 1}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-14 pt-8 border-t border-gray-100">
        <Link href="/guides" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← 전체 가이드 보기
        </Link>
      </div>
    </div>
  )
}
