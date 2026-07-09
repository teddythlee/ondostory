export const dynamic = 'force-dynamic'
import { redirect, notFound } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { getPostByIdAdmin } from '@/lib/posts'
import { getClustersAdmin } from '@/lib/clusters'
import PostEditor from '../PostEditor'

interface Props { params: Promise<{ id: string }> }

export default async function EditPostPage({ params }: Props) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const [post, clusters] = await Promise.all([
    getPostByIdAdmin(id),
    getClustersAdmin().catch(() => []),
  ])
  if (!post) notFound()

  return <PostEditor post={post} clusters={clusters} />
}
