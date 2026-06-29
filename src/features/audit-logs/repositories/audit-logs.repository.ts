import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type { AuditLogWithActor, CreateAuditLogInput } from '../types/audit-logs.types'

type DBClient = SupabaseClient<Database>

export class AuditLogsRepository {
  constructor(private readonly db: DBClient) {}

  async list(): Promise<AuditLogWithActor[]> {
    throw new Error('Not implemented')
  }

  async create(_input: CreateAuditLogInput): Promise<void> {
    throw new Error('Not implemented')
  }
}

export function createAuditLogsRepository(db: DBClient) {
  return new AuditLogsRepository(db)
}
