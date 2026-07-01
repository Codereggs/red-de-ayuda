import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/shared/types/database.types'

export interface Session {
  user: User
  profile: Profile
}

/**
 * Returns the current authenticated user and their profile.
 * Returns null for either if the session is missing or the profile does not exist.
 * Call only in Server Components and Server Actions.
 */
export async function getSession(): Promise<Session | null> {
  const client = await createServerSupabaseClient()

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) return null

  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return { user, profile }
}

/** True when the session belongs to any active internal role. */
export function isActiveHelperOrAdmin(session: Session | null): session is Session {
  if (!session) return false
  return (
    session.profile.status === 'active' &&
    (session.profile.role === 'helper' ||
      session.profile.role === 'campaign_admin' ||
      session.profile.role === 'admin')
  )
}

/** True when the session belongs to an active campaign_admin or admin. */
export function isActiveCampaignAdminOrAdmin(session: Session | null): session is Session {
  if (!session) return false
  return (
    session.profile.status === 'active' &&
    (session.profile.role === 'campaign_admin' || session.profile.role === 'admin')
  )
}

/** True when the session belongs to an active helper (not admin). */
export function isActiveHelper(session: Session | null): boolean {
  if (!session) return false
  return session.profile.status === 'active' && session.profile.role === 'helper'
}
