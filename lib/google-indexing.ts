// Google Indexing API는 JobPosting 또는 VideoObject 안의 BroadcastEvent 전용이다.
// 일반 블로그 글은 호출하지 않고 sitemap lastmod·내부 링크·GSC로 발견/재크롤을 관리한다.
// IndexNow는 이를 지원하는 검색엔진에만 별도로 알린다.

export async function notifyIndexNow(url: string) {
  const apiKey = process.env.INDEXNOW_API_KEY
  if (!apiKey) return { ok: false, skipped: 'INDEXNOW_API_KEY 미설정' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'
  const host = new URL(siteUrl).hostname

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: apiKey,
        keyLocation: `${siteUrl}/${apiKey}.txt`,
        urlList: [url],
      }),
    })
    console.log('IndexNow response:', res.status)
    // 200/202 = 수락, 403 = key 불일치, 422 = URL/키 위치 문제
    return { ok: res.ok, status: res.status }
  } catch (err) {
    console.error('IndexNow error:', err)
    return { ok: false, error: String(err) }
  }
}

// notifyGoogleSitemapPing 제거됨(2026-08-31).
// https://www.google.com/ping?sitemap=... 은 구글이 2023년 폐지했고 현재 404를 반환한다.
// 예외를 삼키는 구조라 무동작인 채로 오래 남아 있었다. 구글에 사이트맵을 알리는 경로는
// robots.txt의 Sitemap 지시자(app/robots.ts)와 Search Console 등록뿐이며, 둘 다 이미 되어 있다.
// 색인이 안 붙는 글은 핑이 아니라 내부 링크·사이트맵 lastmod로 풀어야 한다.
