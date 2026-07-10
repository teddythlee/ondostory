import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ondostory - 온도이야기',
    template: '%s | ondostory',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
  keywords: ['블로그', 'ondostory', '온도이야기'],
  authors: [{ name: 'ondostory' }],
  creator: 'ondostory',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'ondostory',
    title: 'ondostory - 온도이야기',
    description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ondostory - 온도이야기',
    description: '삶의 온도는 하나가 아니다. 새로운 온도를 발견하는 라이프스타일 큐레이션.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'qcRkHRaBgTMclikwipScKtrJJOH_pOj4RIZb8KGvh-Q',
  },
  other: {
    'google-adsense-account': 'ca-pub-3702232308312218',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Cloudflare Web Analytics — 무료 방문/유입 분석 (쿠키 없음) */}
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "5f7dfe0273a3418fbbed4de705205d62"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
