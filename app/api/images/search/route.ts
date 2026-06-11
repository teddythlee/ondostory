export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.get('q')
  const page = req.nextUrl.searchParams.get('page') || '1'
  if (!query) return NextResponse.json({ results: [] })

  const key = process.env.PEXELS_API_KEY
  if (!key) return NextResponse.json({ error: 'PEXELS_API_KEY 환경변수가 없습니다.' }, { status: 500 })

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=12&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: key } })
  if (!res.ok) return NextResponse.json({ error: 'Pexels API 오류' }, { status: res.status })

  const data = await res.json()
  const results = (data.photos as Array<{
    id: number
    src: { medium: string; large: string }
    alt: string
    photographer: string
    photographer_url: string
  }>).map((item) => ({
    id: String(item.id),
    thumbUrl: item.src.medium,
    fullUrl: item.src.large,
    alt: item.alt || '',
    credit: item.photographer,
    creditUrl: item.photographer_url,
  }))

  return NextResponse.json({ results, total_pages: data.total_pages })
}
