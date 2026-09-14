export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'

// 이미지 소싱: Openverse(CC0/PDM = 출처표기 불필요) 우선 → 결과 없으면 Pexels 폴백.
// CC0/퍼블릭도메인이라 라이선스·API 한도 부담이 없다. 실사 퀄이 얇을 때만 Pexels가 받쳐준다.

type ImgResult = {
  id: string
  thumbUrl: string
  fullUrl: string
  alt: string
  credit: string
  creditUrl: string
  license: string
  source: string
}

async function searchOpenverse(query: string, page: string): Promise<{ results: ImgResult[]; total_pages: number }> {
  // license=cc0,pdm → 퍼블릭도메인만. source=flickr,wikimedia → 실사 위주(박물관/유화 배제).
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0,pdm&source=flickr,wikimedia&page_size=12&page=${page}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ondostory-blog/1.0 (teddythlee.biz@gmail.com)' },
  })
  if (!res.ok) return { results: [], total_pages: 0 }
  const data = await res.json()
  const results: ImgResult[] = ((data.results ?? []) as Array<{
    id: string
    url: string
    thumbnail?: string
    foreign_landing_url?: string
    license?: string
    license_version?: string
    creator?: string
    title?: string
  }>).map((it) => ({
    id: it.id,
    // 검색 미리보기에는 원본 CDN을 쓰고, 에디터 삽입 시 자체 저장소로 가져온다.
    thumbUrl: it.url,
    fullUrl: it.url,
    alt: it.title || '',
    credit: it.creator || 'Openverse',
    creditUrl: it.foreign_landing_url || '',
    license: `${(it.license || '').toUpperCase()}${it.license_version ? ' ' + it.license_version : ''}`.trim(),
    source: 'openverse',
  }))
  return { results, total_pages: data.page_count ?? 0 }
}

async function searchPexels(query: string, page: string, key: string): Promise<{ results: ImgResult[]; total_pages: number }> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=12&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: key } })
  if (!res.ok) return { results: [], total_pages: 0 }
  const data = await res.json()
  const results: ImgResult[] = ((data.photos ?? []) as Array<{
    id: number
    src: { medium: string; large: string }
    alt: string
    photographer: string
    photographer_url: string
    url: string
  }>).map((it) => ({
    id: String(it.id),
    thumbUrl: it.src.medium,
    fullUrl: it.src.large,
    alt: it.alt || '',
    credit: it.photographer,
    creditUrl: it.url,
    license: 'Pexels License',
    source: 'pexels',
  }))
  return { results, total_pages: data.total_pages ?? 0 }
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.get('q')
  const page = req.nextUrl.searchParams.get('page') || '1'
  const source = req.nextUrl.searchParams.get('source') || 'auto' // auto | openverse | pexels
  if (!query) return NextResponse.json({ results: [] })

  const key = process.env.PEXELS_API_KEY

  // 명시적으로 Pexels 요청
  if (source === 'pexels') {
    if (!key) return NextResponse.json({ error: 'PEXELS_API_KEY 환경변수가 없습니다.' }, { status: 500 })
    const r = await searchPexels(query, page, key)
    return NextResponse.json({ ...r, source: 'pexels' })
  }

  // 기본: Openverse(CC0/PDM) 먼저
  const ov = await searchOpenverse(query, page)
  if (ov.results.length > 0 || source === 'openverse') {
    return NextResponse.json({ ...ov, source: 'openverse' })
  }
  // 결과 없으면 Pexels 폴백
  if (key) {
    const px = await searchPexels(query, page, key)
    return NextResponse.json({ ...px, source: 'pexels', fellback: true })
  }
  return NextResponse.json({ results: [], total_pages: 0, source: 'openverse' })
}
