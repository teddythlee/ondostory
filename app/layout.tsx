import type { Metadata, Viewport } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

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
  appleWebApp: {
    capable: true,
    title: 'ondostory',
    statusBarStyle: 'default',
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
    // Pinterest 도메인 인증(RSS/도메인 클레임용)
    'p:domain_verify': 'cdb17249bc45ff473c87c627b80b20d6',
    // 네이버 서치어드바이저 사이트 인증
    'naver-site-verification': '39fb77a8b87d7fa3b1ed3a0fdb261492c4d19856',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* RSS 자동발견 링크(절대 URL). 레이아웃 head라 모든 페이지에 렌더됨
            — metadata.alternates는 /blog가 canonical로 덮어써서 사라지므로 여기서 고정. */}
        <link rel="alternate" type="application/rss+xml" title="ondostory RSS" href={`${siteUrl}/rss.xml`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
      {process.env.NODE_ENV === 'production' && <GoogleAnalytics gaId="G-MT2SNQRFHC" />}
    </html>
  )
}
