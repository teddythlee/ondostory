import type { Metadata } from 'next'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondostory.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ondostory - 온도이야기',
    template: '%s | ondostory',
  },
  description: '온도이야기 - 일상의 온도를 담은 블로그',
  keywords: ['블로그', 'ondostory', '온도이야기'],
  authors: [{ name: 'ondostory' }],
  creator: 'ondostory',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'ondostory',
    title: 'ondostory - 온도이야기',
    description: '온도이야기 - 일상의 온도를 담은 블로그',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ondostory - 온도이야기',
    description: '온도이야기 - 일상의 온도를 담은 블로그',
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
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
