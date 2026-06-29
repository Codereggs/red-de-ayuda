/** Cursor-based pagination wrapper for list responses. */
export interface Paginated<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

/** Lightweight summary used in duplicate detection warnings. */
export interface CaseSummary {
  id: string
  publicCode: string
  fullName: string
  status: 'active' | 'archived'
  caseType: 'person' | 'family'
}

/** Payload accepted by the public assistance access log endpoint. */
export interface AssistanceAccessLogPayload {
  caseId: string
  assistanceMethodId: string
  action: 'viewed' | 'copied'
}
