import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getPublishedPosts } from '@/lib/posts'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Metadata } from 'next'
import RelatedPosts from '@/components/blog/RelatedPosts'

export const dynamic = 'force-dynamic'

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
  const url = `${siteUrl}/blog/${post.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image || undefined,
    url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: 'ondostory',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ondostory',
      url: siteUrl,
    },
    keywords: post.tags.join(', '),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900">ondostory</Link>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/blog" className="hover:text-gray-900 transition-colors">블로그</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <Link href="/blog" className="hover:text-gray-600">블로그</Link>
            <span>·</span>
            {post.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-6">{post.excerpt}</p>
          {post.published_at && (
            <time className="text-sm text-gray-400">
              {format(new Date(post.published_at), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
            </time>
          )}
        </div>

        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full rounded-2xl mb-10 max-h-96 object-cover"
          />
        )}

        <article
          className="prose text-gray-800"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <RelatedPosts current={post} all={allPosts} />

        <div className="mt-10 pt-8 border-t border-gray-100">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← 모든 글 보기
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-24">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-sm text-gray-400 space-y-1">
          <p>© {new Date().getFullYear()} ondostory. All rights reserved.</p>
          <p>
            Some photos provided by{' '}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              Pexels
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
