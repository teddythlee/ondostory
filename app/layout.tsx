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
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3702232308312218"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  )
}
