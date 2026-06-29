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
