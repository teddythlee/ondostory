import Link from 'next/link'
import Image from 'next/image'
import FooterNav from '@/components/blog/FooterNav'

// 허브(가이드) 페이지는 /blog 레이아웃 밖이라 동일한 헤더/푸터 크롬을 여기서 재사용한다.
export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/blog" className="flex items-center">
              <Image src="/logo-lockup.png" alt="OndoStory — Warm stories, everyday moments" width={410} height={349} className="h-16 w-auto" priority />
            </Link>
          </div>
          <nav className="flex items-center gap-5 text-sm text-gray-500">
            <Link href="/blog" className="hover:text-gray-900 transition-colors">블로그</Link>
            <Link href="/guides" className="hover:text-gray-900 transition-colors">가이드</Link>
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
            © {new Date().getFullYear()} ondostory. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
