import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '@/shared/types/database.types'
import type { CreateHelperInput, UpdateProfileInput } from '../types/users.types'

type DBClient = SupabaseClient<Database>

export class UsersRepository {
  constructor(private readonly db: DBClient) {}

  async listAll(): Promise<Profile[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .order('full_name')

    if (error) throw new Error(`[UsersRepository.listAll] ${error.message}`)
    return (data ?? []) as Profile[]
  }

  async findById(userId: string): Promise<Profile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`[UsersRepository.findById] ${error.message}`)
    return data as Profile | null
  }

  async update(input: UpdateProfileInput): Promise<Profile> {
    const { userId, fullName, ...rest } = input

    const payload: Database['public']['Tables']['profiles']['Update'] = {
      ...rest,
      ...(fullName !== undefined && { full_name: fullName }),
    }

    const { data, error } = await this.db
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .single()

    if (error) throw new Error(`[UsersRepository.update] ${error.message}`)
    if (!data) throw new Error('[UsersRepository.update] No data returned')
    return data as Profile
  }

  /**
   * Creates a pre-confirmed helper account (no confirmation email is sent) and
   * its matching profile row. Requires a service-role client — bypasses RLS
   * and Supabase Auth's confirmation flow.
   */
  async create(input: CreateHelperInput): Promise<Profile> {
    const { data: authData, error: authError } = await this.db.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new Error(`[UsersRepository.create] ${authError?.message ?? 'No user returned'}`)
    }

    const { data, error } = await this.db
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: input.email,
        full_name: input.fullName,
        role: 'helper',
        status: 'active',
      })
      .select('*')
      .single()

    if (error) {
      await this.db.auth.admin.deleteUser(authData.user.id)
      throw new Error(`[UsersRepository.create] ${error.message}`)
    }

    return data as Profile
  }
}

export function createUsersRepository(db: DBClient) {
  return new UsersRepository(db)
}
