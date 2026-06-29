import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type {
  ArchiveCaseInput,
  PrivateCaseFilters,
  PublicCase,
  PublicCaseFilters,
  RevealAssistancePayload,
} from '../types/cases.types'
import type { Paginated } from '@/shared/types/common.types'

type DBClient = SupabaseClient<Database>

export class CasesRepository {
  constructor(private readonly db: DBClient) {}

  // ── Public reads ─────────────────────────────────────────────────────────

  async listPublic(
    _filters: PublicCaseFilters,
  ): Promise<Paginated<PublicCase>> {
    throw new Error('Not implemented')
  }

  async findPublicById(_id: string): Promise<PublicCase | null> {
    throw new Error('Not implemented')
  }

  /** Service-role only — logs access and returns phones + assistance methods */
  async revealAssistance(_caseId: string): Promise<RevealAssistancePayload> {
    throw new Error('Not implemented')
  }

  // ── Private reads (helper/admin) ──────────────────────────────────────────

  async listPrivate(
    _filters: PrivateCaseFilters,
  ): Promise<Paginated<Database['public']['Tables']['cases']['Row']>> {
    throw new Error('Not implemented')
  }

  async findPrivateById(
    _id: string,
  ): Promise<Database['public']['Tables']['cases']['Row'] | null> {
    throw new Error('Not implemented')
  }

  // ── Duplicate detection ───────────────────────────────────────────────────

  async findByIdNumber(_idNumber: string): Promise<{ id: string; publicCode: string; fullName: string }[]> {
    throw new Error('Not implemented')
  }

  async findByPhone(_phone: string): Promise<{ id: string; publicCode: string; fullName: string }[]> {
    throw new Error('Not implemented')
  }

  // ── Mutations (via Server Actions) ────────────────────────────────────────

  async archive(_input: ArchiveCaseInput): Promise<void> {
    throw new Error('Not implemented')
  }
}

export function createCasesRepository(db: DBClient) {
  return new CasesRepository(db)
}
