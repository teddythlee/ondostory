export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'

export interface BloggerPost {
  title: string
  slug: string
  content: string
  excerpt: string
  published: boolean
  published_at: string | null
  tags: string[]
  cover_image: string | null
}

function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || `post-${Date.now()}`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

function extractCoverImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return match ? match[1] : null
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

  const text = await file.text()

  // Parse Atom XML
  const entryMatches = text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)
  const posts: BloggerPost[] = []
  const slugsSeen = new Set<string>()

  for (const match of entryMatches) {
    const entry = match[1]

    // Only posts (not comments/templates)
    const typeMatch = entry.match(/<blogger:type>([^<]+)<\/blogger:type>/)
    if (!typeMatch || typeMatch[1] !== 'POST') continue

    const statusMatch = entry.match(/<blogger:status>([^<]+)<\/blogger:status>/)
    const status = statusMatch?.[1] ?? 'DRAFT'

    const titleMatch = entry.match(/<title[^>]*>([^<]*)<\/title>/)
    const title = (titleMatch?.[1]
      ?.replace(/&amp;/g, '&')
      ?.replace(/&lt;/g, '<')
      ?.replace(/&gt;/g, '>')
      ?.replace(/&quot;/g, '"') ?? '')
      .replace(/^#+\s*/g, '')
      .replace(/\s*#+\s*/g, ' ')
      .trim()

    const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)
    const rawContent = contentMatch?.[1]
      ?.replace(/&lt;/g, '<')
      ?.replace(/&gt;/g, '>')
      ?.replace(/&amp;/g, '&')
      ?.replace(/&quot;/g, '"') ?? ''

    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/)
    const published_at = publishedMatch?.[1] ?? null

    // Labels
    const labelMatches = entry.matchAll(/<category[^>]+scheme='[^']*#post\.label'[^>]+term='([^']+)'/g)
    const tags = Array.from(labelMatches).map(m => m[1])

    const excerpt = stripHtml(rawContent).slice(0, 200)
    const cover_image = extractCoverImage(rawContent)

    let slug = makeSlug(title)
    if (slugsSeen.has(slug)) slug = `${slug}-${Date.now()}`
    slugsSeen.add(slug)

    posts.push({
      title,
      slug,
      content: rawContent,
      excerpt,
      published: status === 'LIVE',
      published_at,
      tags,
      cover_image,
    })
  }

  return NextResponse.json({ posts })
}
