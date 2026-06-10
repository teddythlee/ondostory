import Link from 'next/link'
import { getPublishedPosts } from '@/lib/posts'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const posts = await getPublishedPosts().catch(() => [])
  const featured = posts.slice(0, 1)[0]
  const recent = posts.slice(1, 7)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900">
            ondostory
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/blog" className="hover:text-gray-900 transition-colors">블로그</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-5xl mb-6">📝</p>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">첫 번째 글을 작성해보세요</h2>
            <p className="text-gray-500">ondostory에 오신 것을 환영합니다</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featured && (
              <section className="mb-16">
                <Link href={`/blog/${featured.slug}`} className="group block">
                  {featured.cover_image && (
                    <img
                      src={featured.cover_image}
                      alt={featured.title}
                      className="w-full h-72 object-cover rounded-2xl mb-6"
                    />
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    {featured.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 px-2 py-1 rounded-full">{tag}</span>
                    ))}
                    {featured.published_at && (
                      <span>{format(new Date(featured.published_at), 'yyyy년 M월 d일', { locale: ko })}</span>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 leading-tight">
                    {featured.title}
                  </h1>
                  <p className="text-gray-600 text-lg leading-relaxed line-clamp-3">{featured.excerpt}</p>
                </Link>
              </section>
            )}

            {/* Recent Posts */}
            {recent.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">최근 글</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {recent.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                      {post.cover_image && (
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-44 object-cover rounded-xl mb-4"
                        />
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
                      {post.published_at && (
                        <p className="text-xs text-gray-400 mt-3">
                          {format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {posts.length > 7 && (
              <div className="text-center mt-12">
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-6 py-2.5 rounded-full hover:border-gray-400 transition-all">
                  모든 글 보기
                </Link>
              </div>
            )}
          </>
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
