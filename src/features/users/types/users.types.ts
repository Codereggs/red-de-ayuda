import type { Profile } from '@/shared/types/database.types'

export interface UpdateProfileInput {
  userId: string
  fullName?: string
  role?: Profile['role']
  status?: Profile['status']
}
