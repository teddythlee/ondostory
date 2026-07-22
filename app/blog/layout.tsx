import Link from 'next/link'
import Image from 'next/image'
import FooterNav from '@/components/blog/FooterNav'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/blog" className="flex items-center gap-2.5">
              <Image src="/logo-lockup.png" alt="OndoStory — Warm stories, everyday moments" width={410} height={349} className="h-16 w-auto" priority />
              <span className="font-serif text-2xl font-semibold tracking-tight text-[#1e3a5f]">OndoStory</span>
            </Link>
          </div>
          <nav className="flex items-center gap-5 text-sm text-gray-500">
            <Link href="/blog" className="hover:text-gray-900 transition-colors">블로그</Link>
            <Link href="/guides" className="hover:text-gray-900 transition-colors">가이드</Link>
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
