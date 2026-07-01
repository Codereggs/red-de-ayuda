'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { CampaignsRepository } from '../repositories/campaigns.repository'
import type { PublicCampaignFilters, PrivateCampaignFilters } from '../types/campaigns.types'

function getRepo() {
  return new CampaignsRepository(createClient())
}

export const campaignsKeys = {
  publicList: (f: PublicCampaignFilters) => ['campaigns', 'public', 'list', f] as const,
  publicDetail: (id: string) => ['campaigns', 'public', id] as const,
  privateList: (f: PrivateCampaignFilters) => ['campaigns', 'private', 'list', f] as const,
  privateDetail: (id: string) => ['campaigns', 'private', id] as const,
  contributions: (campaignId: string) => ['campaigns', campaignId, 'contributions'] as const,
  assistanceMethods: (campaignId: string) =>
    ['campaigns', campaignId, 'assistance-methods'] as const,
}

export function usePublicCampaigns(filters: PublicCampaignFilters) {
  return useInfiniteQuery({
    queryKey: campaignsKeys.publicList(filters),
    queryFn: ({ pageParam }) =>
      getRepo().listPublic({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function usePublicCampaign(id: string) {
  return useQuery({
    queryKey: campaignsKeys.publicDetail(id),
    queryFn: () => getRepo().findPublicById(id),
    enabled: !!id,
  })
}

export function useDashboardCampaigns(filters: PrivateCampaignFilters) {
  return useInfiniteQuery({
    queryKey: campaignsKeys.privateList(filters),
    queryFn: ({ pageParam }) =>
      getRepo().listPrivate({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function useCampaignContributions(campaignId: string) {
  return useQuery({
    queryKey: campaignsKeys.contributions(campaignId),
    queryFn: () => getRepo().listContributions(campaignId),
    enabled: !!campaignId,
  })
}

export function useCampaignAssistanceMethods(campaignId: string) {
  return useQuery({
    queryKey: campaignsKeys.assistanceMethods(campaignId),
    queryFn: () => getRepo().listAssistanceMethods(campaignId),
    enabled: !!campaignId,
  })
}
