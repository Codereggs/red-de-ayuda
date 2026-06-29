import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type {
  CreateHelpRecordInput,
  HelpRecordWithType,
  PublicHelpRecord,
} from '../types/help-records.types'

type DBClient = SupabaseClient<Database>

export class HelpRecordsRepository {
  constructor(private readonly db: DBClient) {}

  async listPublicByCaseId(_caseId: string): Promise<PublicHelpRecord[]> {
    throw new Error('Not implemented')
  }

  async listPrivateByCaseId(_caseId: string): Promise<HelpRecordWithType[]> {
    throw new Error('Not implemented')
  }

  async listHelpTypes(): Promise<Database['public']['Tables']['help_types']['Row'][]> {
    throw new Error('Not implemented')
  }

  async createHelpType(_name: string, _createdByUserId: string): Promise<Database['public']['Tables']['help_types']['Row']> {
    throw new Error('Not implemented')
  }

  async create(_input: CreateHelpRecordInput): Promise<HelpRecordWithType> {
    throw new Error('Not implemented')
  }

  async softDelete(_recordId: string): Promise<void> {
    throw new Error('Not implemented')
  }
}

export function createHelpRecordsRepository(db: DBClient) {
  return new HelpRecordsRepository(db)
}
