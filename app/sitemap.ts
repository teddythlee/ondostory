import { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
  const posts = await getPublishedPosts().catch(() => [])

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...postEntries,
  ]
}
