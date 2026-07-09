import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getClusters, getClusterByKey } from '@/lib/clusters'
import { getPostsByCluster } from '@/lib/posts'
import type { Post } from '@/types'

export const revalidate = 3600
export const dynamicParams = true

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'

interface Props {
  params: Promise<{ cluster: string }>
}

export async function generateStaticParams() {
  const clusters = await getClusters().catch(() => [])
  return clusters.map((c) => ({ cluster: c.key }))
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

export default async function ClusterHubPage({ params }: Props) {
  const { cluster: key } = await params
  const cluster = await getClusterByKey(key)
  if (!cluster) notFound()

  const posts = await getPostsByCluster(cluster.key).catch(() => [])

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
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">아직 정리된 글이 없습니다.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {posts.map((p) => <PostRow key={p.id} post={p} />)}
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
