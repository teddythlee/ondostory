import Link from 'next/link'
import { getPublishedPosts } from '@/lib/posts'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
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

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">블로그</h1>
        <p className="text-gray-500 mb-12">총 {posts.length}개의 글</p>

        {posts.length === 0 ? (
          <div className="text-center py-24 text-gray-400">아직 작성된 글이 없습니다.</div>
        ) : (
          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.id} className="group border-b border-gray-100 pb-12 last:border-0">
                <Link href={`/blog/${post.slug}`}>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    {post.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                    {post.published_at && (
                      <span>{format(new Date(post.published_at), 'yyyy년 M월 d일', { locale: ko })}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed line-clamp-3">{post.excerpt}</p>
                  <span className="inline-block mt-4 text-sm text-blue-500 group-hover:underline">
                    읽기 →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 mt-24">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} ondostory. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
