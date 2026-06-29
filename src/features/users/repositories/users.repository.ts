import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '@/shared/types/database.types'
import type { UpdateProfileInput } from '../types/users.types'

type DBClient = SupabaseClient<Database>

export class UsersRepository {
  constructor(private readonly db: DBClient) {}

  async listAll(): Promise<Profile[]> {
    throw new Error('Not implemented')
  }

  async findById(_userId: string): Promise<Profile | null> {
    throw new Error('Not implemented')
  }

  async update(_input: UpdateProfileInput): Promise<Profile> {
    throw new Error('Not implemented')
  }
}

export function createUsersRepository(db: DBClient) {
  return new UsersRepository(db)
}
