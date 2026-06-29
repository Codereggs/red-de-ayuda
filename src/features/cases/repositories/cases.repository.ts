import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CasePhone, AssistanceMethod } from '@/shared/types/database.types'
import type {
  ArchiveCaseInput,
  PrivateCaseFilters,
  PublicCase,
  PublicCaseFilters,
  RevealAssistancePayload,
} from '../types/cases.types'
import type { Paginated } from '@/shared/types/common.types'
import { PAGE_SIZE, encodeCursor, decodeCursor } from '@/shared/utils/pagination'

type DBClient = SupabaseClient<Database>
type CaseRow = Database['public']['Tables']['cases']['Row']

type RawPublicCase = {
  id: string
  public_code: string
  case_type: 'person' | 'family'
  full_name: string
  public_notes: string | null
  public_contact_place: string
  country: string
  state: string
  city: string
  last_helped_at: string | null
  situation_categories: { id: string; name: string } | null
  case_needs: {
    id: string
    quantity: number
    unit: string | null
    comments: string | null
    deleted_at: string | null
    need_categories: { id: string; name: string } | null
  }[]
}

const PUBLIC_SELECT =
  'id, public_code, case_type, full_name, public_notes, public_contact_place, country, state, city, last_helped_at, situation_categories(id, name), case_needs(id, quantity, unit, comments, deleted_at, need_categories(id, name))'

export class CasesRepository {
  constructor(private readonly db: DBClient) {}

  // ── Public reads ─────────────────────────────────────────────────────────

  async listPublic(filters: PublicCaseFilters): Promise<Paginated<PublicCase>> {
    const offset = filters.cursor ? decodeCursor(filters.cursor) : 0

    // Resolve need-category filter up-front — PostgREST can't filter on joined rows without !inner
    let restrictToIds: string[] | null = null
    if (filters.needCategoryId) {
      const { data: needRows, error: needErr } = await this.db
        .from('case_needs')
        .select('case_id')
        .eq('need_category_id', filters.needCategoryId)
        .is('deleted_at', null)
      if (needErr) throw new Error(`[CasesRepository.listPublic - need filter] ${needErr.message}`)
      restrictToIds = [...new Set((needRows ?? []).map((r) => r.case_id))]
      if (restrictToIds.length === 0) return { data: [], nextCursor: null, hasMore: false }
    }

    let query = this.db
      .from('cases')
      .select(PUBLIC_SELECT)
      .eq('status', 'active')
      .eq('verified', true)
      .is('archived_at', null)
      .is('deleted_at', null)

    if (filters.state) query = query.eq('state', filters.state)
    if (filters.city) query = query.eq('city', filters.city)
    if (filters.situationId) query = query.eq('situation_category_id', filters.situationId)
    if (filters.search) {
      query = query.textSearch('full_name', filters.search, { type: 'websearch', config: 'simple' })
    }
    if (restrictToIds) query = query.in('id', restrictToIds)

    // Fetch PAGE_SIZE + 1 to detect hasMore without a separate COUNT query
    query = query
      .order('last_helped_at', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE)

    const { data, error } = await query
    if (error) throw new Error(`[CasesRepository.listPublic] ${error.message}`)

    const rows = (data ?? []) as unknown as RawPublicCase[]
    const hasMore = rows.length > PAGE_SIZE
    const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows

    const countMap = await this.batchHelpRecordCounts(pageRows.map((r) => r.id))

    return {
      data: pageRows.map((row) => this.toPublicCase(row, countMap.get(row.id) ?? 0)),
      nextCursor: hasMore ? encodeCursor(offset + PAGE_SIZE) : null,
      hasMore,
    }
  }

  async findPublicById(id: string): Promise<PublicCase | null> {
    const { data, error } = await this.db
      .from('cases')
      .select(PUBLIC_SELECT)
      .eq('id', id)
      .eq('status', 'active')
      .eq('verified', true)
      .is('archived_at', null)
      .is('deleted_at', null)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`[CasesRepository.findPublicById] ${error.message}`)
    if (!data) return null

    const raw = data as unknown as RawPublicCase
    const countMap = await this.batchHelpRecordCounts([raw.id])
    return this.toPublicCase(raw, countMap.get(raw.id) ?? 0)
  }

  /** Service-role client required — bypasses RLS on assistance_methods. */
  async revealAssistance(caseId: string): Promise<RevealAssistancePayload> {
    const [phonesResult, methodsResult] = await Promise.all([
      this.db
        .from('case_phones')
        .select('*')
        .eq('case_id', caseId)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false }),
      this.db
        .from('assistance_methods')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false }),
    ])

    if (phonesResult.error) {
      throw new Error(`[CasesRepository.revealAssistance - phones] ${phonesResult.error.message}`)
    }
    if (methodsResult.error) {
      throw new Error(`[CasesRepository.revealAssistance - methods] ${methodsResult.error.message}`)
    }

    return {
      phones: (phonesResult.data ?? []) as CasePhone[],
      assistanceMethods: (methodsResult.data ?? []) as AssistanceMethod[],
    }
  }

  // ── Private reads (helper / admin) ───────────────────────────────────────

  async listPrivate(filters: PrivateCaseFilters): Promise<Paginated<CaseRow>> {
    const offset = filters.cursor ? decodeCursor(filters.cursor) : 0

    let restrictToIds: string[] | null = null
    if (filters.needCategoryId) {
      const { data: needRows, error: needErr } = await this.db
        .from('case_needs')
        .select('case_id')
        .eq('need_category_id', filters.needCategoryId)
        .is('deleted_at', null)
      if (needErr) throw new Error(`[CasesRepository.listPrivate - need filter] ${needErr.message}`)
      restrictToIds = [...new Set((needRows ?? []).map((r) => r.case_id))]
      if (restrictToIds.length === 0) return { data: [], nextCursor: null, hasMore: false }
    }

    let query = this.db.from('cases').select('*').is('deleted_at', null)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.caseType) query = query.eq('case_type', filters.caseType)
    if (filters.state) query = query.eq('state', filters.state)
    if (filters.city) query = query.eq('city', filters.city)
    if (filters.situationId) query = query.eq('situation_category_id', filters.situationId)
    if (filters.search) {
      query = query.textSearch('full_name', filters.search, { type: 'websearch', config: 'simple' })
    }
    if (restrictToIds) query = query.in('id', restrictToIds)

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE)

    const { data, error } = await query
    if (error) throw new Error(`[CasesRepository.listPrivate] ${error.message}`)

    const rows = (data ?? []) as CaseRow[]
    const hasMore = rows.length > PAGE_SIZE
    const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows

    return {
      data: pageRows,
      nextCursor: hasMore ? encodeCursor(offset + PAGE_SIZE) : null,
      hasMore,
    }
  }

  async findPrivateById(id: string): Promise<CaseRow | null> {
    const { data, error } = await this.db
      .from('cases')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`[CasesRepository.findPrivateById] ${error.message}`)
    return data as CaseRow | null
  }

  // ── Duplicate detection ──────────────────────────────────────────────────

  async findByIdNumber(idNumber: string): Promise<{ id: string; publicCode: string; fullName: string }[]> {
    type Row = { case_id: string; cases: { id: string; public_code: string; full_name: string } | null }

    const { data, error } = await this.db
      .from('case_private_data')
      .select('case_id, cases(id, public_code, full_name)')
      .eq('id_number', idNumber)
      .is('deleted_at', null)

    if (error) throw new Error(`[CasesRepository.findByIdNumber] ${error.message}`)

    return ((data ?? []) as unknown as Row[])
      .filter((row) => row.cases !== null)
      .map((row) => ({
        id: row.case_id,
        publicCode: row.cases!.public_code,
        fullName: row.cases!.full_name,
      }))
  }

  async findByPhone(phone: string): Promise<{ id: string; publicCode: string; fullName: string }[]> {
    type Row = { case_id: string; cases: { id: string; public_code: string; full_name: string } | null }

    const { data, error } = await this.db
      .from('case_phones')
      .select('case_id, cases(id, public_code, full_name)')
      .eq('phone', phone)
      .is('deleted_at', null)

    if (error) throw new Error(`[CasesRepository.findByPhone] ${error.message}`)

    return ((data ?? []) as unknown as Row[])
      .filter((row) => row.cases !== null)
      .map((row) => ({
        id: row.case_id,
        publicCode: row.cases!.public_code,
        fullName: row.cases!.full_name,
      }))
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async archive(input: ArchiveCaseInput): Promise<void> {
    const { error } = await this.db
      .from('cases')
      .update({
        status: 'archived',
        archive_reason: input.archiveReason,
        archived_by_user_id: input.archivedByUserId,
        archived_at: new Date().toISOString(),
      })
      .eq('id', input.caseId)
      .is('deleted_at', null)

    if (error) throw new Error(`[CasesRepository.archive] ${error.message}`)
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async batchHelpRecordCounts(caseIds: string[]): Promise<Map<string, number>> {
    if (caseIds.length === 0) return new Map()

    const { data, error } = await this.db
      .from('help_records')
      .select('case_id')
      .in('case_id', caseIds)
      .is('deleted_at', null)

    if (error) throw new Error(`[CasesRepository.batchHelpRecordCounts] ${error.message}`)

    const map = new Map<string, number>()
    for (const row of data ?? []) {
      map.set(row.case_id, (map.get(row.case_id) ?? 0) + 1)
    }
    return map
  }

  private toPublicCase(raw: RawPublicCase, helpRecordsCount: number): PublicCase {
    return {
      id: raw.id,
      public_code: raw.public_code,
      case_type: raw.case_type,
      full_name: raw.full_name,
      public_notes: raw.public_notes,
      public_contact_place: raw.public_contact_place,
      country: raw.country,
      state: raw.state,
      city: raw.city,
      last_helped_at: raw.last_helped_at,
      situation: raw.situation_categories ?? { id: '', name: '' },
      needs: (raw.case_needs ?? [])
        .filter((n) => !n.deleted_at && n.need_categories !== null)
        .map((n) => ({
          id: n.id,
          quantity: n.quantity,
          unit: n.unit,
          comments: n.comments,
          category: n.need_categories!,
        })),
      helpRecordsCount,
      lastHelpSummary: null,
    }
  }
}

export function createCasesRepository(db: DBClient) {
  return new CasesRepository(db)
}
