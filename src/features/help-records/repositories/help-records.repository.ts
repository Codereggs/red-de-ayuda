import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type {
  CreateHelpRecordInput,
  HelpRecordWithType,
  PublicHelpRecord,
} from '../types/help-records.types'
import { normalizeText } from '@/shared/utils/normalize-text'

type DBClient = Pick<SupabaseClient<Database>, 'from'>
type HelpTypeRow = Database['public']['Tables']['help_types']['Row']
type HelpRecordRow = Database['public']['Tables']['help_records']['Row']

type RawPrivateHelpRecord = HelpRecordRow & {
  help_types: HelpTypeRow | null
  help_record_needs: { case_need_id: string }[]
}

type RawPublicHelpRecord = {
  id: string
  title: string
  description: string | null
  amount_usd: number | null
  helped_at: string
  help_types: { name: string } | null
  help_record_needs: {
    case_needs: { need_categories: { name: string } | null } | null
  }[]
}

export class HelpRecordsRepository {
  constructor(private readonly db: DBClient) {}

  async listPublicByCaseId(caseId: string): Promise<PublicHelpRecord[]> {
    const { data, error } = await this.db
      .from('help_records')
      .select(
        'id, title, description, amount_usd, helped_at, help_types(name), help_record_needs(case_needs(need_categories(name)))',
      )
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('helped_at', { ascending: false })

    if (error) throw new Error(`[HelpRecordsRepository.listPublicByCaseId] ${error.message}`)

    return ((data ?? []) as unknown as RawPublicHelpRecord[]).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      amountUsd: row.amount_usd,
      helpedAt: row.helped_at,
      helpTypeName: row.help_types?.name ?? '',
      associatedNeedNames: row.help_record_needs
        .map((hrn) => hrn.case_needs?.need_categories?.name ?? null)
        .filter((n): n is string => n !== null),
    }))
  }

  async listPrivateByCaseId(caseId: string): Promise<HelpRecordWithType[]> {
    const { data, error } = await this.db
      .from('help_records')
      .select('*, help_types(*), help_record_needs(case_need_id)')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('helped_at', { ascending: false })

    if (error) throw new Error(`[HelpRecordsRepository.listPrivateByCaseId] ${error.message}`)

    const rows = ((data ?? []) as unknown as RawPrivateHelpRecord[]).filter(
      (row) => row.help_types !== null,
    )
    const creatorIds = [
      ...new Set(rows.map((row) => row.created_by_user_id).filter((id): id is string => !!id)),
    ]
    const creators = new Map<string, { fullName: string; email: string }>()

    if (creatorIds.length > 0) {
      const { data: profiles, error: profilesError } = await this.db
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds)
      if (profilesError) {
        throw new Error(
          `[HelpRecordsRepository.listPrivateByCaseId - profiles] ${profilesError.message}`,
        )
      }
      for (const profile of profiles ?? []) {
        creators.set(profile.id, { fullName: profile.full_name, email: profile.email })
      }
    }

    return rows.map((row) => ({
      id: row.id,
      case_id: row.case_id,
      help_type_id: row.help_type_id,
      created_by_user_id: row.created_by_user_id,
      title: row.title,
      description: row.description,
      amount_usd: row.amount_usd,
      helped_at: row.helped_at,
      private_notes: row.private_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      helpType: row.help_types!,
      caseNeedIds: row.help_record_needs.map((hrn) => hrn.case_need_id),
      createdBy: row.created_by_user_id ? (creators.get(row.created_by_user_id) ?? null) : null,
    }))
  }

  async listHelpTypes(): Promise<HelpTypeRow[]> {
    const { data, error } = await this.db
      .from('help_types')
      .select('*')
      .is('deleted_at', null)
      .order('name')

    if (error) throw new Error(`[HelpRecordsRepository.listHelpTypes] ${error.message}`)
    return (data ?? []) as HelpTypeRow[]
  }

  async createHelpType(name: string, createdByUserId: string): Promise<HelpTypeRow> {
    const normalized = normalizeText(name)

    const { data, error } = await this.db
      .from('help_types')
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

    if (error) throw new Error(`[HelpRecordsRepository.createHelpType] ${error.message}`)
    if (!data) throw new Error('[HelpRecordsRepository.createHelpType] No data returned')
    return data as HelpTypeRow
  }

  async create(input: CreateHelpRecordInput): Promise<HelpRecordWithType> {
    const uniqueNeedIds = [...new Set(input.caseNeedIds)]
    const { data: validNeeds, error: validNeedsError } = await this.db
      .from('case_needs')
      .select('id')
      .eq('case_id', input.caseId)
      .in('id', uniqueNeedIds)
      .is('deleted_at', null)

    if (validNeedsError) {
      throw new Error(`[HelpRecordsRepository.create - validate needs] ${validNeedsError.message}`)
    }
    if ((validNeeds ?? []).length !== uniqueNeedIds.length) {
      throw new Error('[HelpRecordsRepository.create] One or more needs do not belong to the case')
    }

    // Insert help_record and eagerly join help_types in one round-trip
    const { data: recordData, error: recordError } = await this.db
      .from('help_records')
      .insert({
        case_id: input.caseId,
        help_type_id: input.helpTypeId,
        created_by_user_id: input.createdByUserId,
        title: input.title,
        description: input.description ?? null,
        amount_usd: input.amountUsd ?? null,
        helped_at: input.helpedAt,
        private_notes: input.privateNotes ?? null,
      })
      .select('*, help_types(*)')
      .single()

    if (recordError) throw new Error(`[HelpRecordsRepository.create] ${recordError.message}`)
    if (!recordData) throw new Error('[HelpRecordsRepository.create] No data returned')

    const rawRecord = recordData as unknown as RawPrivateHelpRecord

    // Insert help_record_needs associations (not transactional — MVP accepted risk)
    if (uniqueNeedIds.length > 0) {
      const { error: needsError } = await this.db.from('help_record_needs').insert(
        uniqueNeedIds.map((caseNeedId) => ({
          help_record_id: rawRecord.id,
          case_need_id: caseNeedId,
        })),
      )
      if (needsError) {
        throw new Error(`[HelpRecordsRepository.create - needs] ${needsError.message}`)
      }
    }

    return {
      id: rawRecord.id,
      case_id: rawRecord.case_id,
      help_type_id: rawRecord.help_type_id,
      created_by_user_id: rawRecord.created_by_user_id,
      title: rawRecord.title,
      description: rawRecord.description,
      amount_usd: rawRecord.amount_usd,
      helped_at: rawRecord.helped_at,
      private_notes: rawRecord.private_notes,
      created_at: rawRecord.created_at,
      updated_at: rawRecord.updated_at,
      deleted_at: rawRecord.deleted_at,
      helpType: rawRecord.help_types!,
      caseNeedIds: uniqueNeedIds,
      createdBy: null,
    }
  }

  async softDelete(caseId: string, recordId: string): Promise<void> {
    const { data, error } = await this.db
      .from('help_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recordId)
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .select('id')
      .single()

    if (error) throw new Error(`[HelpRecordsRepository.softDelete] ${error.message}`)
    if (!data) throw new Error('[HelpRecordsRepository.softDelete] No data returned')
  }
}

export function createHelpRecordsRepository(db: DBClient) {
  return new HelpRecordsRepository(db)
}
