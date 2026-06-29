import { redirect } from 'next/navigation'
import { getSession } from './get-session'
import type { Session } from './get-session'

/**
 * Requires an authenticated user with an active profile.
 * Redirects to /login if the session is missing or the profile is inactive.
 * Use in Server Components and Server Actions that require any authenticated role.
 */
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

/**
 * Requires an authenticated user with role = 'admin'.
 * Redirects to /dashboard if the user is authenticated but not an admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth()

  if (session.profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return session
}

/**
 * Requires an authenticated user with role = 'helper' or 'admin'.
 * Equivalent to requireAuth() since all internal roles can access helper routes.
 * Kept explicit for readability at the call site.
 */
export async function requireHelperOrAdmin(): Promise<Session> {
  return requireAuth()
}
