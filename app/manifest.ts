import type { MetadataRoute } from 'next'

// Web app manifest only — no service worker (so no stale-cache issues).
// Enables "Add to Home Screen" / install with a standalone, app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ondostory - 온도이야기',
    short_name: 'ondostory',
    description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
    // 공개 앱: 일반 사용자도 설치할 수 있으니 블로그를 기본 진입점으로.
    // 관리자(오너)는 앱 아이콘 롱프레스 → shortcuts(아이디어 캡처·초안 검토)로 진입.
    start_url: '/blog',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'ko',
    icons: [
      { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' },
      { src: '/favicon.png', sizes: 'any', type: 'image/png', purpose: 'any' },
    ],
    // Long-press the app icon (Android) → quick admin shortcuts for the owner.
    shortcuts: [
      { name: '아이디어 캡처', short_name: '아이디어', url: '/admin/ideas' },
      { name: '초안 검토', short_name: '초안', url: '/admin/drafts' },
    ],
    // Receive shared photos (Google Photos → 공유 → ondostory) into the idea form.
    // Android Chrome supported; iOS Safari ignores this.
    share_target: {
      action: '/admin/ideas/share',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        // Android is unreliable at delivering files when accept is the bare
        // 'image/*' wildcard — explicit MIME types make the WebAPK's share
        // intent filter actually receive the file. Include HEIC/HEIF (iPhone/
        // some Android cameras) too.
        files: [
          {
            name: 'photos',
            accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/*'],
          },
        ],
      },
    },
  } as MetadataRoute.Manifest
}
