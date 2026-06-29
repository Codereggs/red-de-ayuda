import type { AssistanceMethod } from '@/shared/types/database.types'

export type CreateAssistanceMethodInput = Omit<
  AssistanceMethod,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>

export interface UpdateAssistanceMethodInput
  extends Partial<
    Omit<AssistanceMethod, 'id' | 'case_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  > {
  id: string
}
