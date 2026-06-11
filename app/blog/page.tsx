import Link from 'next/link'
import { getPublishedPosts } from '@/lib/posts'
import PostList from '@/components/blog/PostList'
import FooterNav from '@/components/blog/FooterNav'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '블로그',
  description: 'ondostory 블로그 - 모든 글',
}

export default async function BlogPage() {
  const posts = await getPublishedPosts().catch(() => [])

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900">ondostory</Link>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/blog" className="hover:text-gray-900 transition-colors font-medium text-gray-900">블로그</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">블로그</h1>
        {posts.length === 0 ? (
          <div className="text-center py-24 text-gray-400">아직 작성된 글이 없습니다.</div>
        ) : (
          <PostList posts={posts} />
        )}
      </main>

      <footer className="border-t border-gray-100 mt-24">
        <div className="py-6">
          <FooterNav />
          <div className="max-w-5xl mx-auto px-4 pb-4 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} ondostory. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
