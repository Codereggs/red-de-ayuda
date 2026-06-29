import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type { AuditLogWithActor, CreateAuditLogInput } from '../types/audit-logs.types'

type DBClient = SupabaseClient<Database>

type RawAuditLog = {
  id: string
  actor_user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string; email: string } | null
}

export class AuditLogsRepository {
  constructor(private readonly db: DBClient) {}

  async list(): Promise<AuditLogWithActor[]> {
    const { data, error } = await this.db
      .from('audit_logs')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw new Error(`[AuditLogsRepository.list] ${error.message}`)

    return ((data ?? []) as unknown as RawAuditLog[]).map((row) => ({
      id: row.id,
      actor_user_id: row.actor_user_id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      old_values: row.old_values,
      new_values: row.new_values,
      metadata: row.metadata,
      created_at: row.created_at,
      actorName: row.profiles?.full_name ?? null,
      actorEmail: row.profiles?.email ?? null,
    }))
  }

  async create(input: CreateAuditLogInput): Promise<void> {
    const { error } = await this.db.from('audit_logs').insert({
      actor_user_id: input.actorUserId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      metadata: input.metadata ?? null,
    })

    if (error) throw new Error(`[AuditLogsRepository.create] ${error.message}`)
  }
}

export function createAuditLogsRepository(db: DBClient) {
  return new AuditLogsRepository(db)
}
