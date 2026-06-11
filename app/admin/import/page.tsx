import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import BloggerImport from './BloggerImport'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← 관리자</a>
          <span className="text-gray-300">·</span>
          <span className="text-sm font-medium text-gray-700">Blogger 가져오기</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <BloggerImport />
      </main>
    </div>
  )
}
