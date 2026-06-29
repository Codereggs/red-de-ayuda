import type { HelpRecord, HelpType } from '@/shared/types/database.types'

export interface HelpRecordWithType extends HelpRecord {
  helpType: HelpType
  /** IDs of case_needs this record is associated with */
  caseNeedIds: string[]
}

/** Public-safe view — no helper identity, no private notes */
export interface PublicHelpRecord {
  id: string
  title: string
  description: string | null
  amountUsd: number | null
  helpedAt: string
  helpTypeName: string
  associatedNeedNames: string[]
}

export interface CreateHelpRecordInput {
  caseId: string
  helpTypeId: string
  title: string
  description?: string
  amountUsd?: number
  helpedAt: string
  privateNotes?: string
  caseNeedIds: string[]
}
