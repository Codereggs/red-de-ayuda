import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  CasePhone,
  AssistanceMethod,
  CasePrivateData,
} from '@/shared/types/database.types'
import type {
  ArchiveCaseInput,
  CreateCaseInput,
  PrivateCaseFilters,
  PublicCase,
  PublicCaseFilters,
  RevealAssistancePayload,
  UpdateCaseInput,
} from '../types/cases.types'
import type { Paginated } from '@/shared/types/common.types'
import { PAGE_SIZE, encodeCursor, decodeCursor } from '@/shared/utils/pagination'

type DBClient = Pick<SupabaseClient<Database>, 'from'>
type CaseRow = Database['public']['Tables']['cases']['Row']

type RawPublicCase = {
  id: string
  public_code: string
  case_type: 'person' | 'family'
  full_name: string
  short_description: string
  public_notes: string | null
  public_contact_place: string
  country: string
  state: string
  city: string
  last_helped_at: string | null
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
  'id, public_code, case_type, full_name, short_description, public_notes, public_contact_place, country, state, city, last_helped_at, case_needs(id, quantity, unit, comments, deleted_at, need_categories(id, name))'

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

    if (filters.state) query = query.ilike('state', filters.state)
    if (filters.city) query = query.ilike('city', filters.city)
    if (filters.search) {
      const search = filters.search.replace(/[%_,()]/g, ' ').trim()
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,short_description.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%,country.ilike.%${search}%`,
        )
      }
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
    const orderedRows = filters.randomSeed
      ? this.randomizeWithinPriorityGroups(pageRows, filters.randomSeed)
      : pageRows

    const countMap = await this.batchHelpRecordCounts(orderedRows.map((r) => r.id))

    return {
      data: orderedRows.map((row) => this.toPublicCase(row, countMap.get(row.id) ?? 0)),
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
    if (filters.search) {
      const search = filters.search.replace(/[%_,()]/g, ' ').trim()
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,public_code.ilike.%${search}%,short_description.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%,country.ilike.%${search}%`,
        )
      }
    }
    if (restrictToIds) query = query.in('id', restrictToIds)

    query = query.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE)

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

  async findByIdNumber(
    idNumber: string,
  ): Promise<{ id: string; publicCode: string; fullName: string }[]> {
    type Row = {
      case_id: string
      cases: { id: string; public_code: string; full_name: string } | null
    }

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

  async findByPhone(
    phone: string,
  ): Promise<{ id: string; publicCode: string; fullName: string }[]> {
    type Row = {
      case_id: string
      cases: { id: string; public_code: string; full_name: string } | null
    }

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

  // ── Private data & phones (read) ─────────────────────────────────────────

  async findPrivateDataByCaseId(caseId: string): Promise<CasePrivateData | null> {
    const { data, error } = await this.db
      .from('case_private_data')
      .select('*')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .single()
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`[CasesRepository.findPrivateDataByCaseId] ${error.message}`)
    return data as CasePrivateData | null
  }

  async findPhonesByCaseId(caseId: string): Promise<CasePhone[]> {
    const { data, error } = await this.db
      .from('case_phones')
      .select('*')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
    if (error) throw new Error(`[CasesRepository.findPhonesByCaseId] ${error.message}`)
    return (data ?? []) as CasePhone[]
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(input: CreateCaseInput): Promise<CaseRow> {
    const { data: caseData, error: caseError } = await this.db
      .from('cases')
      .insert({
        full_name: input.fullName,
        case_type: input.caseType,
        short_description: input.shortDescription,
        public_contact_place: input.publicContactPlace,
        state: input.state,
        city: input.city,
        country: input.country,
        public_notes: input.publicNotes ?? null,
        created_by_user_id: input.createdByUserId,
      })
      .select('*')
      .single()

    if (caseError) throw new Error(`[CasesRepository.create] ${caseError.message}`)
    if (!caseData) throw new Error('[CasesRepository.create] No data returned')

    const caseId = caseData.id

    const { error: privateError } = await this.db.from('case_private_data').upsert(
      {
        case_id: caseId,
        id_number: input.privateData.idNumber,
        birth_date: input.privateData.birthDate ?? null,
        previous_full_address: input.privateData.previousFullAddress,
        current_full_address: input.privateData.currentFullAddress,
        verification_notes: input.privateData.verificationNotes,
        private_notes: input.privateData.privateNotes ?? null,
      },
      { onConflict: 'case_id' },
    )

    if (privateError)
      throw new Error(`[CasesRepository.create - private data] ${privateError.message}`)

    if (input.phones.length > 0) {
      const { error: phonesError } = await this.db.from('case_phones').insert(
        input.phones.map((p) => ({
          case_id: caseId,
          phone: p.phone,
          label: p.label ?? null,
          is_primary: p.isPrimary,
        })),
      )
      if (phonesError) throw new Error(`[CasesRepository.create - phones] ${phonesError.message}`)
    }

    return caseData as CaseRow
  }

  async update(input: UpdateCaseInput): Promise<void> {
    const { error: caseError } = await this.db
      .from('cases')
      .update({
        full_name: input.fullName,
        case_type: input.caseType,
        short_description: input.shortDescription,
        public_contact_place: input.publicContactPlace,
        state: input.state,
        city: input.city,
        country: input.country,
        public_notes: input.publicNotes ?? null,
        updated_by_user_id: input.updatedByUserId,
      })
      .eq('id', input.caseId)
      .is('deleted_at', null)

    if (caseError) throw new Error(`[CasesRepository.update] ${caseError.message}`)

    const { error: privateError } = await this.db.from('case_private_data').upsert(
      {
        case_id: input.caseId,
        id_number: input.privateData.idNumber,
        birth_date: input.privateData.birthDate ?? null,
        previous_full_address: input.privateData.previousFullAddress,
        current_full_address: input.privateData.currentFullAddress,
        verification_notes: input.privateData.verificationNotes,
        private_notes: input.privateData.privateNotes ?? null,
      },
      { onConflict: 'case_id' },
    )

    if (privateError)
      throw new Error(`[CasesRepository.update - private data] ${privateError.message}`)

    // Replace phones: soft-delete existing, insert new ones
    const { error: deletePhoneError } = await this.db
      .from('case_phones')
      .update({ deleted_at: new Date().toISOString() })
      .eq('case_id', input.caseId)
      .is('deleted_at', null)

    if (deletePhoneError)
      throw new Error(`[CasesRepository.update - delete phones] ${deletePhoneError.message}`)

    if (input.phones.length > 0) {
      const { error: phonesError } = await this.db.from('case_phones').insert(
        input.phones.map((p) => ({
          case_id: input.caseId,
          phone: p.phone,
          label: p.label ?? null,
          is_primary: p.isPrimary,
        })),
      )
      if (phonesError) throw new Error(`[CasesRepository.update - phones] ${phonesError.message}`)
    }
  }

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
      short_description: raw.short_description,
      public_notes: raw.public_notes,
      public_contact_place: raw.public_contact_place,
      country: raw.country,
      state: raw.state,
      city: raw.city,
      last_helped_at: raw.last_helped_at,
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

  private randomizeWithinPriorityGroups(rows: RawPublicCase[], seed: string): RawPublicCase[] {
    const score = (value: string) => {
      let hash = 2166136261
      for (const character of `${seed}:${value}`) {
        hash ^= character.charCodeAt(0)
        hash = Math.imul(hash, 16777619)
      }
      return hash >>> 0
    }

    return [...rows].sort((a, b) => {
      const priorityA = a.last_helped_at ?? ''
      const priorityB = b.last_helped_at ?? ''
      if (priorityA !== priorityB) return priorityA.localeCompare(priorityB)
      return score(a.id) - score(b.id)
    })
  }
}

export function createCasesRepository(db: DBClient) {
  return new CasesRepository(db)
}
