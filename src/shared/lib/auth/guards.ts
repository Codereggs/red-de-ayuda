import { redirect } from 'next/navigation'
import { getSession } from './get-session'
import type { Session } from './get-session'

export async function requireAuth(): Promise<Session> {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.profile.status !== 'active') {
    redirect('/login')
  }

  return session
}

/** Requires role = 'admin'. Redirects to /dashboard otherwise. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth()

  if (session.profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return session
}

/** Requires role = 'campaign_admin' or 'admin'. Redirects to /dashboard otherwise. */
export async function requireCampaignAdminOrAdmin(): Promise<Session> {
  const session = await requireAuth()

  if (session.profile.role !== 'admin' && session.profile.role !== 'campaign_admin') {
    redirect('/dashboard')
  }

  return session
}

/** Any authenticated active role. */
export async function requireHelperOrAdmin(): Promise<Session> {
  return requireAuth()
}
