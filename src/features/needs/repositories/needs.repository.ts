import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type { CaseNeedWithCategory, CreateCaseNeedInput, UpdateCaseNeedInput } from '../types/needs.types'

type DBClient = SupabaseClient<Database>

export class NeedsRepository {
  constructor(private readonly db: DBClient) {}

  async listByCaseId(_caseId: string): Promise<CaseNeedWithCategory[]> {
    throw new Error('Not implemented')
  }

  async listCategories(): Promise<Database['public']['Tables']['need_categories']['Row'][]> {
    throw new Error('Not implemented')
  }

  async createCategory(_name: string, _createdByUserId: string): Promise<Database['public']['Tables']['need_categories']['Row']> {
    throw new Error('Not implemented')
  }

  async create(_input: CreateCaseNeedInput): Promise<CaseNeedWithCategory> {
    throw new Error('Not implemented')
  }

  async update(_input: UpdateCaseNeedInput): Promise<CaseNeedWithCategory> {
    throw new Error('Not implemented')
  }

  async softDelete(_needId: string): Promise<void> {
    throw new Error('Not implemented')
  }
}

export function createNeedsRepository(db: DBClient) {
  return new NeedsRepository(db)
}
