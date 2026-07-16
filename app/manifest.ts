import type { MetadataRoute } from 'next'

// Web app manifest only — no service worker (so no stale-cache issues).
// Enables "Add to Home Screen" / install with a standalone, app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ondostory - 온도이야기',
    short_name: 'ondostory',
    description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
    // Opens the admin capture form (this PWA is the owner's tool). Not logged in
    // → redirects to /admin/login. Public site still reachable via the header logo.
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
