import { cookies } from 'next/headers'
import { verifyAdminSessionToken } from './admin-session'

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  return verifyAdminSessionToken(token)
}

export async function requireAdmin() {
  const session = await getAdminSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
