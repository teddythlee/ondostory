export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import PostEditor from '../PostEditor'

export default async function NewPostPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return <PostEditor />
}
