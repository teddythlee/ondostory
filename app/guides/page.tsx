import Link from 'next/link'
import type { Metadata } from 'next'
import { getClusters } from '@/lib/clusters'
import { getPublishedPosts } from '@/lib/posts'

// 클러스터 변경이 즉시 반영되도록 동적 렌더(저트래픽 허브라 비용 무시).
export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '가이드',
    description: '미국 정착, 맛집 등 주제별로 직접 겪은 실무 후기를 모은 가이드 모음입니다.',
    alternates: { canonical: `${siteUrl}/guides` },
  }
}

export default async function GuidesIndexPage() {
  const [clusters, posts] = await Promise.all([
    getClusters().catch(() => []),
    getPublishedPosts().catch(() => []),
  ])

  const countByCluster = posts.reduce<Record<string, number>>((acc, p) => {
    if (p.cluster) acc[p.cluster] = (acc[p.cluster] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">가이드</h1>
        <p className="text-gray-500 leading-relaxed">주제별로 직접 겪은 실무를 모았습니다. 하나씩 깊게 정리해가는 중이에요.</p>
      </header>

      {clusters.length === 0 ? (
        <div className="text-center py-20 text-gray-400">아직 가이드가 없습니다.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clusters.map((c) => (
            <Link
              key={c.id}
              href={`/guides/${c.key}`}
              className="group rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
            >
              <div className="text-3xl mb-3">{c.emoji}</div>
              <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">{c.title}</h2>
              <p className="text-sm text-gray-500 line-clamp-2">{c.tagline}</p>
              <p className="text-xs text-gray-400 mt-3">{countByCluster[c.key] ?? 0}개의 글</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-14 pt-8 border-t border-gray-100">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← 모든 글 보기
        </Link>
      </div>
    </div>
  )
}
