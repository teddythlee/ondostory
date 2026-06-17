import { getPublishedPosts } from '@/lib/posts'
import PostList from '@/components/blog/PostList'
import type { Metadata } from 'next'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'

export const metadata: Metadata = {
  title: 'ondostory 블로그 - 온도이야기',
  description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
  alternates: { canonical: `${siteUrl}/blog` },
}

interface Props {
  searchParams: Promise<{ tag?: string; category?: string; q?: string }>
}

export default async function BlogPage({ searchParams }: Props) {
  const { tag, category, q } = await searchParams
  const posts = await getPublishedPosts().catch(() => [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {posts.length === 0 ? (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-8">블로그</h1>
          <div className="text-center py-24 text-gray-400">아직 작성된 글이 없습니다.</div>
        </>
      ) : (
        <PostList
          posts={posts}
          initialTag={tag ?? null}
          initialCategory={category ?? null}
          initialQ={q ?? ''}
        />
      )}
    </div>
  )
}
