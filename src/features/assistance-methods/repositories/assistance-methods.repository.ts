import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type {
  CreateAssistanceMethodInput,
  UpdateAssistanceMethodInput,
} from '../types/assistance-methods.types'

type DBClient = SupabaseClient<Database>
type AssistanceMethodRow = Database['public']['Tables']['assistance_methods']['Row']

export class AssistanceMethodsRepository {
  constructor(private readonly db: DBClient) {}

  async listByCaseId(caseId: string): Promise<AssistanceMethodRow[]> {
    const { data, error } = await this.db
      .from('assistance_methods')
      .select('*')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw new Error(`[AssistanceMethodsRepository.listByCaseId] ${error.message}`)
    return (data ?? []) as AssistanceMethodRow[]
  }

  async create(input: CreateAssistanceMethodInput): Promise<AssistanceMethodRow> {
    const { data, error } = await this.db
      .from('assistance_methods')
      .insert(input)
      .select('*')
      .single()

    if (error) throw new Error(`[AssistanceMethodsRepository.create] ${error.message}`)
    if (!data) throw new Error('[AssistanceMethodsRepository.create] No data returned')
    return data as AssistanceMethodRow
  }

  async update(input: UpdateAssistanceMethodInput): Promise<AssistanceMethodRow> {
    const { id, ...updates } = input

    const { data, error } = await this.db
      .from('assistance_methods')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single()

    if (error) throw new Error(`[AssistanceMethodsRepository.update] ${error.message}`)
    if (!data) throw new Error('[AssistanceMethodsRepository.update] No data returned')
    return data as AssistanceMethodRow
  }

  async deactivate(methodId: string): Promise<void> {
    const { error } = await this.db
      .from('assistance_methods')
      .update({ is_active: false })
      .eq('id', methodId)
      .is('deleted_at', null)

    if (error) throw new Error(`[AssistanceMethodsRepository.deactivate] ${error.message}`)
  }

  async softDelete(methodId: string): Promise<void> {
    const { error } = await this.db
      .from('assistance_methods')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', methodId)

    if (error) throw new Error(`[AssistanceMethodsRepository.softDelete] ${error.message}`)
  }

  async logAccess(
    caseId: string,
    methodId: string | null,
    action: 'viewed' | 'copied',
    ipHash: string,
    userAgent: string,
  ): Promise<void> {
    const { error } = await this.db.from('assistance_method_access_logs').insert({
      case_id: caseId,
      assistance_method_id: methodId,
      action,
      ip_hash: ipHash,
      user_agent: userAgent,
    })

    if (error) throw new Error(`[AssistanceMethodsRepository.logAccess] ${error.message}`)
  }
}

export function createAssistanceMethodsRepository(db: DBClient) {
  return new AssistanceMethodsRepository(db)
}
