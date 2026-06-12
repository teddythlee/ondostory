import Link from 'next/link'
import type { Post } from '@/types'

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = copy.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const j = hash % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function RelatedPosts({ current, all }: { current: Post; all: Post[] }) {
  const others = all.filter(p => p.id !== current.id)
  if (others.length === 0) return null

  // 태그 겹치는 글 우선, 나머지는 랜덤으로 채워서 최대 3개
  const tagged = others.filter(p => p.tags.some(t => current.tags.includes(t)))
  const untagged = seededShuffle(others.filter(p => !p.tags.some(t => current.tags.includes(t))), current.id)
  const picks = [...tagged, ...untagged].slice(0, 3)

  return (
    <section className="mt-16 pt-10 border-t border-gray-100">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">다른 글 보기</h3>
      <ul className="space-y-3">
        {picks.map(post => (
          <li key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              className="flex items-center gap-3 group"
            >
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-base text-gray-300">
                  📝
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                {post.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
