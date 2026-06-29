import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type {
  CreateAssistanceMethodInput,
  UpdateAssistanceMethodInput,
} from '../types/assistance-methods.types'

type DBClient = SupabaseClient<Database>

export class AssistanceMethodsRepository {
  constructor(private readonly db: DBClient) {}

  async listByCaseId(
    _caseId: string,
  ): Promise<Database['public']['Tables']['assistance_methods']['Row'][]> {
    throw new Error('Not implemented')
  }

  async create(
    _input: CreateAssistanceMethodInput,
  ): Promise<Database['public']['Tables']['assistance_methods']['Row']> {
    throw new Error('Not implemented')
  }

  async update(
    _input: UpdateAssistanceMethodInput,
  ): Promise<Database['public']['Tables']['assistance_methods']['Row']> {
    throw new Error('Not implemented')
  }

  async deactivate(_methodId: string): Promise<void> {
    throw new Error('Not implemented')
  }

  async softDelete(_methodId: string): Promise<void> {
    throw new Error('Not implemented')
  }

  async logAccess(
    _caseId: string,
    _methodId: string | null,
    _action: 'viewed' | 'copied',
    _ipHash: string,
    _userAgent: string,
  ): Promise<void> {
    throw new Error('Not implemented')
  }
}

export function createAssistanceMethodsRepository(db: DBClient) {
  return new AssistanceMethodsRepository(db)
}
