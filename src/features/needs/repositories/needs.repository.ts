import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type {
  CaseNeedWithCategory,
  CreateCaseNeedInput,
  UpdateCaseNeedInput,
} from '../types/needs.types'
import { normalizeText } from '@/shared/utils/normalize-text'

type DBClient = Pick<SupabaseClient<Database>, 'from'>
type NeedCategoryRow = Database['public']['Tables']['need_categories']['Row']

type RawCaseNeed = {
  id: string
  case_id: string
  need_category_id: string
  quantity: number
  unit: string | null
  comments: string | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  need_categories: NeedCategoryRow | null
}

export class NeedsRepository {
  constructor(private readonly db: DBClient) {}

  async listByCaseId(caseId: string): Promise<CaseNeedWithCategory[]> {
    const { data, error } = await this.db
      .from('case_needs')
      .select('*, need_categories(*)')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`[NeedsRepository.listByCaseId] ${error.message}`)

    return ((data ?? []) as unknown as RawCaseNeed[])
      .filter((row) => row.need_categories !== null)
      .map((row) => ({
        id: row.id,
        case_id: row.case_id,
        need_category_id: row.need_category_id,
        quantity: row.quantity,
        unit: row.unit,
        comments: row.comments,
        created_by_user_id: row.created_by_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        category: row.need_categories!,
      }))
  }

  async listCategories(): Promise<NeedCategoryRow[]> {
    const { data, error } = await this.db
      .from('need_categories')
      .select('*')
      .is('deleted_at', null)
      .order('name')

    if (error) throw new Error(`[NeedsRepository.listCategories] ${error.message}`)
    return (data ?? []) as NeedCategoryRow[]
  }

  async createCategory(name: string, createdByUserId: string): Promise<NeedCategoryRow> {
    const normalized = normalizeText(name)

    const { data, error } = await this.db
      .from('need_categories')
      .upsert(
        {
          name,
          normalized_name: normalized,
          created_by_user_id: createdByUserId,
          deleted_at: null,
        },
        { onConflict: 'normalized_name' },
      )
      .select('*')
      .single()

    if (error) throw new Error(`[NeedsRepository.createCategory] ${error.message}`)
    if (!data) throw new Error('[NeedsRepository.createCategory] No data returned')
    return data as NeedCategoryRow
  }

  async create(input: CreateCaseNeedInput): Promise<CaseNeedWithCategory> {
    const { data, error } = await this.db
      .from('case_needs')
      .insert({
        case_id: input.caseId,
        need_category_id: input.needCategoryId,
        quantity: input.quantity,
        unit: input.unit ?? null,
        comments: input.comments ?? null,
        created_by_user_id: input.createdByUserId,
      })
      .select('*, need_categories(*)')
      .single()

    if (error) throw new Error(`[NeedsRepository.create] ${error.message}`)
    if (!data) throw new Error('[NeedsRepository.create] No data returned')

    const raw = data as unknown as RawCaseNeed
    if (!raw.need_categories) throw new Error('[NeedsRepository.create] Category not found')

    return {
      id: raw.id,
      case_id: raw.case_id,
      need_category_id: raw.need_category_id,
      quantity: raw.quantity,
      unit: raw.unit,
      comments: raw.comments,
      created_by_user_id: raw.created_by_user_id,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      deleted_at: raw.deleted_at,
      category: raw.need_categories,
    }
  }

  async update(input: UpdateCaseNeedInput): Promise<CaseNeedWithCategory> {
    const { needId, ...updates } = input

    const payload: Database['public']['Tables']['case_needs']['Update'] = {}
    if (updates.needCategoryId !== undefined) {
      payload.need_category_id = updates.needCategoryId
    }
    if (updates.quantity !== undefined) payload.quantity = updates.quantity
    if (updates.unit !== undefined) payload.unit = updates.unit
    if (updates.comments !== undefined) payload.comments = updates.comments

    const { data, error } = await this.db
      .from('case_needs')
      .update(payload)
      .eq('id', needId)
      .eq('case_id', input.caseId)
      .is('deleted_at', null)
      .select('*, need_categories(*)')
      .single()

    if (error) throw new Error(`[NeedsRepository.update] ${error.message}`)
    if (!data) throw new Error('[NeedsRepository.update] No data returned')

    const raw = data as unknown as RawCaseNeed
    if (!raw.need_categories) throw new Error('[NeedsRepository.update] Category not found')

    return {
      id: raw.id,
      case_id: raw.case_id,
      need_category_id: raw.need_category_id,
      quantity: raw.quantity,
      unit: raw.unit,
      comments: raw.comments,
      created_by_user_id: raw.created_by_user_id,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      deleted_at: raw.deleted_at,
      category: raw.need_categories,
    }
  }

  async softDelete(caseId: string, needId: string): Promise<void> {
    const { data, error } = await this.db
      .from('case_needs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', needId)
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .select('id')
      .single()

    if (error) throw new Error(`[NeedsRepository.softDelete] ${error.message}`)
    if (!data) throw new Error('[NeedsRepository.softDelete] No data returned')
  }
}

export function createNeedsRepository(db: DBClient) {
  return new NeedsRepository(db)
}
