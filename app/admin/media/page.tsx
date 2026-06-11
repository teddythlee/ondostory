export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import MediaLibrary from './MediaLibrary'

export default async function MediaPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return <MediaLibrary />
}
