import Link from 'next/link'
import Image from 'next/image'
import FooterNav from '@/components/blog/FooterNav'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/blog" className="flex items-center gap-2">
              <div className="bg-gray-900 rounded-lg p-1">
                <Image src="/logo.png" alt="ondostory" width={28} height={28} className="rounded-md" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">ondostory</span>
            </Link>
            <div className="hidden sm:block w-px h-8 bg-gray-200" />
            <p className="hidden sm:block text-[10px] leading-[1.6] text-gray-300 hover:text-gray-500 transition-colors cursor-default">
              삶에는 하나의 온도만 있는 것이 아니다.<br />
              가장 차가운 순간도 있고,<br />
              가장 뜨거운 순간도 있다.<br />
              그리고 그 사이의 수많은 온도들이 우리의 이야기를 만든다.
            </p>
          </div>
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
