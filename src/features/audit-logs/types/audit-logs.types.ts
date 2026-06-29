import type { AuditLog } from '@/shared/types/database.types'

export interface CreateAuditLogInput {
  actorUserId: string
  entityType: string
  entityId: string
  action: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface AuditLogWithActor extends AuditLog {
  actorName: string | null
  actorEmail: string | null
}
