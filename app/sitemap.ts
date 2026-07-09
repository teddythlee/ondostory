import { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/posts'
import { CLUSTERS } from '@/lib/clusters'

export const dynamic = 'force-dynamic'

// getPublishedPosts에서 제외되는 고정 페이지들. 루트 /는 /blog로 리다이렉트되므로 넣지 않는다.
const STATIC_PAGE_SLUGS = ['about', 'contact', 'privacy-policy', 'terms', 'disclaimer']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
  const posts = await getPublishedPosts().catch(() => [])

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const staticPageEntries: MetadataRoute.Sitemap = STATIC_PAGE_SLUGS.map((slug) => ({
    url: `${siteUrl}/blog/${slug}`,
    changeFrequency: 'yearly',
    priority: 0.3,
  }))

  // 클러스터 허브(필러) 페이지들 — 색인 우선순위를 높게 준다.
  const clusterEntries: MetadataRoute.Sitemap = Object.values(CLUSTERS).map((c) => ({
    url: `${siteUrl}/guides/${c.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  return [
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...clusterEntries,
    ...postEntries,
    ...staticPageEntries,
  ]
}
