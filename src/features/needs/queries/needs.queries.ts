'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import type { NeedCategory } from '@/shared/types/database.types'
import { NeedsRepository } from '../repositories/needs.repository'
import type { CaseNeedWithCategory } from '../types/needs.types'

function getRepository() {
  return new NeedsRepository(createClient())
}

export const needsKeys = {
  byCase: (caseId: string) => ['needs', 'case', caseId] as const,
  categories: () => ['needs', 'categories'] as const,
}

export function useCaseNeeds(caseId: string, initialData?: CaseNeedWithCategory[]) {
  return useQuery({
    queryKey: needsKeys.byCase(caseId),
    queryFn: () => getRepository().listByCaseId(caseId),
    initialData,
  })
}

export function useNeedCategories(initialData?: NeedCategory[]) {
  return useQuery({
    queryKey: needsKeys.categories(),
    queryFn: () => getRepository().listCategories(),
    initialData,
    staleTime: 10 * 60 * 1000,
  })
}
