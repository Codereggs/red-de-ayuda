'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { CasesRepository } from '../repositories/cases.repository'
import type { PublicCaseFilters, PrivateCaseFilters } from '../types/cases.types'

function getRepo() {
  return new CasesRepository(createClient())
}

export const casesKeys = {
  publicList: (f: PublicCaseFilters) => ['cases', 'public', 'list', f] as const,
  publicDetail: (id: string) => ['cases', 'public', id] as const,
  privateList: (f: PrivateCaseFilters) => ['cases', 'private', 'list', f] as const,
  privateDetail: (id: string) => ['cases', 'private', id] as const,
}

export function usePublicCases(filters: PublicCaseFilters) {
  return useInfiniteQuery({
    queryKey: casesKeys.publicList(filters),
    queryFn: ({ pageParam }) =>
      getRepo().listPublic({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function usePublicCase(id: string) {
  return useQuery({
    queryKey: casesKeys.publicDetail(id),
    queryFn: () => getRepo().findPublicById(id),
    enabled: !!id,
  })
}

export function useDashboardCases(filters: PrivateCaseFilters) {
  return useInfiniteQuery({
    queryKey: casesKeys.privateList(filters),
    queryFn: ({ pageParam }) =>
      getRepo().listPrivate({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}
