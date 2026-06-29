import type { CaseNeed, NeedCategory } from '@/shared/types/database.types'

export interface CaseNeedWithCategory extends CaseNeed {
  category: NeedCategory
}

export interface CreateCaseNeedInput {
  caseId: string
  needCategoryId: string
  quantity: number
  unit?: string
  comments?: string
  createdByUserId: string
}

export interface UpdateCaseNeedInput {
  caseId: string
  needId: string
  needCategoryId?: string
  quantity?: number
  unit?: string | null
  comments?: string | null
}
