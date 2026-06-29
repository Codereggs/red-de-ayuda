'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import type { HelpType } from '@/shared/types/database.types'
import { HelpRecordsRepository } from '../repositories/help-records.repository'
import type { HelpRecordWithType, PublicHelpRecord } from '../types/help-records.types'

function getRepository() {
  return new HelpRecordsRepository(createClient())
}

export const helpRecordsKeys = {
  publicByCase: (caseId: string) => ['help-records', 'public', caseId] as const,
  privateByCase: (caseId: string) => ['help-records', 'private', caseId] as const,
  types: () => ['help-records', 'types'] as const,
}

export function usePublicHelpRecords(caseId: string, initialData?: PublicHelpRecord[]) {
  return useQuery({
    queryKey: helpRecordsKeys.publicByCase(caseId),
    queryFn: () => getRepository().listPublicByCaseId(caseId),
    initialData,
  })
}

export function usePrivateHelpRecords(caseId: string, initialData?: HelpRecordWithType[]) {
  return useQuery({
    queryKey: helpRecordsKeys.privateByCase(caseId),
    queryFn: () => getRepository().listPrivateByCaseId(caseId),
    initialData,
  })
}

export function useHelpTypes(initialData?: HelpType[]) {
  return useQuery({
    queryKey: helpRecordsKeys.types(),
    queryFn: () => getRepository().listHelpTypes(),
    initialData,
    staleTime: 10 * 60 * 1000,
  })
}
