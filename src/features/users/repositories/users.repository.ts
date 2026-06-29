import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '@/shared/types/database.types'
import type { UpdateProfileInput } from '../types/users.types'

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
}

export function createUsersRepository(db: DBClient) {
  return new UsersRepository(db)
}
