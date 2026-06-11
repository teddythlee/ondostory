import Link from 'next/link'
import FooterNav from '@/components/blog/FooterNav'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/blog" className="text-xl font-bold tracking-tight text-gray-900">
            ondostory
          </Link>
          <nav className="flex items-center gap-5 text-sm text-gray-500">
            <Link href="/blog" className="hover:text-gray-900 transition-colors">블로그</Link>
            <Link href="/blog/about" className="hover:text-gray-900 transition-colors">소개</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-gray-100 mt-16">
        <div className="py-5">
          <FooterNav />
          <p className="text-center text-xs text-gray-400 mt-3">
            © {new Date().getFullYear()} ondostory. All rights reserved. &nbsp;·&nbsp; Some photos by{' '}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Pexels</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
