export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

// 관리자가 클러스터를 조정한 뒤 "사이트 갱신"을 누르면, 클러스터가 영향을 주는
// 공개 페이지(가이드 인덱스·허브·글 하단 링크·sitemap)를 즉시 재생성한다.
export async function POST() {
  try {
    await requireAdmin()
    revalidatePath('/guides')
    revalidatePath('/guides/[cluster]', 'page')
    revalidatePath('/blog/[slug]', 'page')
    revalidatePath('/blog')
    revalidatePath('/sitemap.xml')
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
