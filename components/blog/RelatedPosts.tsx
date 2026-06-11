import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Post } from '@/types'

export default function RelatedPosts({ current, all }: { current: Post; all: Post[] }) {
  const related = all
    .filter(p => p.id !== current.id && p.tags.some(t => current.tags.includes(t)))
    .slice(0, 3)

  if (related.length === 0) return null

  return (
    <section className="mt-16 pt-10 border-t border-gray-100">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">연관 글</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {related.map(post => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group">
            {post.cover_image ? (
              <img src={post.cover_image} alt={post.title} className="w-full h-32 object-cover rounded-xl mb-3" />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-3 flex items-center justify-center text-2xl text-gray-300">
                📝
              </div>
            )}
            <div className="flex gap-1 mb-1.5 flex-wrap">
              {post.tags.filter(t => current.tags.includes(t)).slice(0, 2).map(tag => (
                <span key={tag} className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
              {post.title}
            </h4>
            {post.published_at && (
              <p className="text-xs text-gray-400 mt-1.5">
                {format(new Date(post.published_at), 'yyyy.MM.dd', { locale: ko })}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
