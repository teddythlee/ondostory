import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getPublishedPosts } from '@/lib/posts'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Metadata } from 'next'
import RelatedPosts from '@/components/blog/RelatedPosts'
import ViewCounter from '@/components/blog/ViewCounter'
import EmailReveal from '@/components/blog/EmailReveal'
import { getClusterByKey } from '@/lib/clusters'

export const revalidate = 600
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

  // 브랜드가 웹의 다른 곳에서 같은 주체임을 선언(sameAs) → 구글 엔티티 그래프 강화(E-E-A-T).
  // 실제 존재하는 공식 채널만 넣는다(죽은 링크는 오히려 신호를 깎는다).
  const social = [
    'https://www.facebook.com/ondostoryofficial',
    'https://www.pinterest.com/ondostory',
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image || undefined,
    url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    // 저자는 실명 Person(디스커버 E-E-A-T ↑). About 페이지가 저자 소개(누가·왜)를 담는다.
    // sameAs: 저자가 운영하는 프로필을 연결해 엔티티(저자 정체성)를 묶는다.
    author: {
      '@type': 'Person',
      name: '온도스토리',
      url: `${siteUrl}/blog/about`,
      sameAs: social,
    },
    publisher: {
      '@type': 'Organization',
      name: 'OndoStory',
      url: siteUrl,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png` },
      sameAs: social,
    },
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
          {post.category && (
            <>
              <span>·</span>
              <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="text-blue-500 hover:text-blue-700 font-medium">{post.category}</Link>
            </>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>
        <div className="text-sm text-gray-400 flex flex-wrap items-center gap-x-2">
          {/* 저자 표기(byline) — 구글은 스키마를 페이지에 보이는 내용과 교차확인한다(E-E-A-T). */}
          <Link href="/blog/about" className="text-gray-600 hover:text-gray-900 font-medium">온도스토리</Link>
          {post.published_at && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={post.published_at}>
                {format(new Date(post.published_at), 'yyyy년 M월 d일', { locale: ko })}
              </time>
            </>
          )}
        </div>
      </div>

      <article
        className="prose text-gray-800"
        dangerouslySetInnerHTML={{
          // [메일문의:주소] 또는 [메일문의:주소|제목] → "메일로 문의" 클릭 링크.
          // 주소는 base64로 숨겨서 넣는다(스팸봇 방지). 표시 글자는 "메일로 문의".
          __html: post.content.replace(
            /\[메일문의:\s*([^\]|]+?)\s*(?:\|\s*([^\]]+?))?\s*\]/g,
            (_m, email, subj) => {
              const enc = btoa(String(email))
              const s = (subj ? String(subj) : 'ondostory 문의').replace(/"/g, '&quot;')
              return `<a href="#" data-mail="${enc}" data-subj="${s}" class="text-blue-600 underline">메일로 문의</a>`
            }
          ),
        }}
      />
      <EmailReveal />

      {cluster && (
        <Link
          href={`/guides/${cluster.key}`}
          className="mt-10 flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-5 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
        >
          <span className="text-3xl">{cluster.emoji}</span>
          <span className="flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-blue-400 mb-0.5">가이드 모음</span>
            <span className="block text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {cluster.title} 전체 보기
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">{cluster.tagline}</span>
          </span>
          <span className="text-blue-300 group-hover:text-blue-500 transition-colors text-lg">→</span>
        </Link>
      )}

      <RelatedPosts current={post} all={allPosts} />

      {post.tags.length > 0 && (
        <div className="mt-12 pt-6 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 pt-8 border-t border-gray-100">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← 모든 글 보기
        </Link>
      </div>
    </div>
  )
}
