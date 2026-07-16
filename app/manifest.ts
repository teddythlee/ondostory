import type { MetadataRoute } from 'next'

// Web app manifest only — no service worker (so no stale-cache issues).
// Enables "Add to Home Screen" / install with a standalone, app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ondostory - 온도이야기',
    short_name: 'ondostory',
    description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
    // Owner's tool — opens straight to the admin capture form (login if needed).
    // A stray public installer lands on /admin/login, which has a "홈으로" link.
    start_url: '/admin/ideas',
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
        files: [{ name: 'photos', accept: ['image/*'] }],
      },
    },
  } as MetadataRoute.Manifest
}
