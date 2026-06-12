import { Suspense } from 'react'
import { getPublishedPosts } from '@/lib/posts'
import PostList from '@/components/blog/PostList'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '블로그',
  description: 'ondostory 블로그 - 모든 글',
}

export default async function BlogPage() {
  const posts = await getPublishedPosts().catch(() => [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">블로그</h1>
      {posts.length === 0 ? (
        <div className="text-center py-24 text-gray-400">아직 작성된 글이 없습니다.</div>
      ) : (
        <Suspense>
          <PostList posts={posts} />
        </Suspense>
      )}
    </div>
  )
}
