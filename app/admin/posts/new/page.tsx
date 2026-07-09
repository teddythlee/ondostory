export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { getClustersAdmin } from '@/lib/clusters'
import PostEditor from '../PostEditor'

export default async function NewPostPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const clusters = await getClustersAdmin().catch(() => [])
  return <PostEditor clusters={clusters} />
}
