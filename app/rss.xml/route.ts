import { getRecentPublishedWithContent } from '@/lib/posts'

// 새 글이 바로 피드에 뜨도록 매 요청마다 생성(자동 게시 도구가 폴링).
export const dynamic = 'force-dynamic'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA 안에 ]]> 가 있으면 깨지므로 안전하게 분할.
function cdata(s: string) {
  return `<![CDATA[${(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

function imageType(url: string) {
  const u = url.toLowerCase()
  if (u.endsWith('.png')) return 'image/png'
  if (u.endsWith('.webp')) return 'image/webp'
  if (u.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondostory.com'
  const posts = await getRecentPublishedWithContent(50).catch(() => [])

  const items = posts
    .map((p) => {
      const url = `${siteUrl}/blog/${p.slug}`
      const date = new Date(p.published_at || p.created_at).toUTCString()
      const enclosure = p.cover_image
        ? `\n      <enclosure url="${esc(p.cover_image)}" type="${imageType(p.cover_image)}" />`
        : ''
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${cdata(p.excerpt || '')}</description>${enclosure}
      <content:encoded>${cdata((p.content || '').replace(/\[메일문의:[^\]]*\]/g, '메일로 문의'))}</content:encoded>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>ondostory - 온도이야기</title>
    <link>${siteUrl}/blog</link>
    <description>삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.</description>
    <language>ko</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600',
    },
  })
}
