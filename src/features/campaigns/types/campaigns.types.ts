import type { Campaign, CampaignAssistanceMethod, CampaignContribution } from '@/shared/types/database.types'

export type CampaignStatus = 'collecting' | 'purchasing' | 'shipping' | 'completed'
export type ContributionStatus = 'pending' | 'verified' | 'rejected'

export interface PublicCampaignMemberNeed {
  id: string
  needCategoryId: string
  needCategoryName: string
  price_usd: number
  purchased_at: string | null
}

export interface PublicCampaignMember {
  caseId: string
  fullName: string
  needs: PublicCampaignMemberNeed[]
}

export interface PublicCampaign
  extends Pick<
    Campaign,
    | 'id'
    | 'public_code'
    | 'title'
    | 'description'
    | 'goal_amount_usd'
    | 'raised_amount_usd'
    | 'status'
    | 'cover_image_path'
    | 'created_at'
    | 'updated_at'
  > {
  progressPct: number
  members: PublicCampaignMember[]
}

export interface PublicCampaignFilters {
  status?: CampaignStatus
  search?: string
  cursor?: string
}

export interface PrivateCampaignFilters extends PublicCampaignFilters {
  includeArchived?: boolean
}

export interface CreateCampaignInput {
  title: string
  description?: string
  goalAmountUsd: number
  createdByUserId: string
}

export interface UpdateCampaignInput {
  campaignId: string
  title: string
  description?: string
  goalAmountUsd: number
  updatedByUserId: string
}

export interface ArchiveCampaignInput {
  campaignId: string
  archiveReason: string
  archivedByUserId: string
}

export interface AddCampaignMemberInput {
  campaignId: string
  fullName: string
  idNumber?: string
  privateNotes?: string
  createdByUserId: string
  needs: { needCategoryId: string; priceUsd: number }[]
}

export interface CreateContributionInput {
  campaignId: string
  amountUsd: number
  contributorName?: string
  reference?: string
  receiptImagePath?: string | null
  transferredAt: string
  notes?: string
  createdByUserId: string
}

export interface CreateCampaignAssistanceMethodInput {
  campaignId: string
  countryCode: string
  type: CampaignAssistanceMethod['type']
  label: string
  isPrimary?: boolean
  isActive?: boolean
  holderFullName: string
  idNumber?: string
  phone?: string
  bankName?: string
  accountNumber?: string
  accountType?: string
  alias?: string
  notes?: string
}

export interface UpdateCampaignAssistanceMethodInput
  extends Omit<CreateCampaignAssistanceMethodInput, 'campaignId'> {
  methodId: string
}

export type ContributionWithCreator = CampaignContribution & {
  createdBy: { fullName: string; email: string } | null
  verifiedBy: { fullName: string; email: string } | null
}
