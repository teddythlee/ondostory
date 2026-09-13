import type { PostMeta } from '@/types'
import TrackedLink from '@/components/analytics/TrackedLink'
import { getRelatedPosts, getRecommendationReason } from '@/lib/post-navigation'

export default function RelatedPosts({ current, all }: { current: PostMeta; all: PostMeta[] }) {
  const others = all.filter(p => p.id !== current.id)
  if (others.length === 0) return null

  const picks = getRelatedPosts(current, all)

  return (
    <section className="mt-10 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5 sm:p-6">
      <p className="text-xs font-semibold text-blue-500 mb-1">다음 단계</p>
      <h2 className="font-display text-xl text-gray-900 mb-1">이어서 읽으면 좋은 글</h2>
      <p className="text-sm text-gray-500 mb-5">방금 읽은 내용과 같은 흐름에서 필요한 정보를 골랐습니다.</p>
      <ol className="space-y-3">
        {picks.map((post, index) => (
          <li key={post.id}>
            <TrackedLink
              href={`/blog/${post.slug}`}
              eventName="internal_recommendation_click"
              eventParams={{
                source_slug: current.slug,
                target_slug: post.slug,
                link_location: 'article_related',
                recommendation_position: index + 1,
              }}
              className="flex items-center gap-3 rounded-xl bg-white p-3 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group"
            >
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-base text-gray-300">
                  📝
                </div>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] text-blue-500 mb-0.5">{getRecommendationReason(current, post)}</span>
                <span className="block text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  {post.title}
                </span>
              </span>
              <span className="text-blue-300 group-hover:text-blue-500 transition-colors" aria-hidden>→</span>
            </TrackedLink>
          </li>
        ))}
      </ol>
    </section>
  )
}
