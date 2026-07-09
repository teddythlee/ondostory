import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getPublishedPosts } from '@/lib/posts'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Metadata } from 'next'
import RelatedPosts from '@/components/blog/RelatedPosts'
import ViewCounter from '@/components/blog/ViewCounter'
import { getClusterByKey } from '@/lib/clusters'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const posts = await getPublishedPosts().catch(() => [])
  return posts.map((post) => ({ slug: post.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
  const url = `${siteUrl}/blog/${post.slug}`

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      url,
      type: 'article',
      publishedTime: post.published_at || undefined,
      tags: post.tags,
      images: post.cover_image ? [{ url: post.cover_image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.cover_image ? [post.cover_image] : [],
    },
    alternates: { canonical: url },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const allPosts = await getPublishedPosts().catch(() => [])
  const cluster = await getClusterByKey(post.cluster)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
  const url = `${siteUrl}/blog/${post.slug}`

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '블로그', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image || undefined,
    url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: 'ondostory', url: siteUrl },
    publisher: { '@type': 'Organization', name: 'ondostory', url: siteUrl },
    keywords: post.tags.join(', '),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <ViewCounter slug={post.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link href="/blog" className="hover:text-gray-600">블로그</Link>
          <span>·</span>
          {post.category && (
            <>
              <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="text-blue-500 hover:text-blue-700 font-medium">{post.category}</Link>
              <span>·</span>
            </>
          )}
          {post.tags.map((tag) => (
            <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="bg-gray-100 px-2 py-0.5 rounded-full hover:bg-gray-200 transition-colors">{tag}</Link>
          ))}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>
{post.published_at && (
          <time className="text-sm text-gray-400">
            {format(new Date(post.published_at), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
          </time>
        )}
      </div>

      <article
        className="prose text-gray-800"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {cluster && (
        <Link
          href={`/guides/${cluster.key}`}
          className="mt-14 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
        >
          <span className="text-2xl">{cluster.emoji}</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {cluster.title} 전체 보기
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">{cluster.tagline}</span>
          </span>
          <span className="text-gray-300 group-hover:text-blue-400 transition-colors">→</span>
        </Link>
      )}

      <RelatedPosts current={post} all={allPosts} />

      <div className="mt-10 pt-8 border-t border-gray-100">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← 모든 글 보기
        </Link>
      </div>
    </div>
  )
}
