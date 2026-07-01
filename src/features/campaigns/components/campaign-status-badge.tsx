import { CAMPAIGN_STATUS_LABELS, CONTRIBUTION_STATUS_LABELS } from '@/shared/constants'
import type { CampaignStatus, ContributionStatus } from '../types/campaigns.types'

interface CampaignStatusBadgeProps {
  status: CampaignStatus
}

const statusStyles: Record<CampaignStatus, string> = {
  collecting: 'bg-primary/10 text-primary',
  purchasing: 'bg-accent/30 text-foreground',
  shipping: 'bg-secondary text-foreground',
  completed: 'bg-muted text-muted-foreground',
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}
    >
      {CAMPAIGN_STATUS_LABELS[status] ?? status}
    </span>
  )
}

interface ContributionStatusBadgeProps {
  status: ContributionStatus
}

const contributionStyles: Record<ContributionStatus, string> = {
  pending: 'bg-accent/30 text-foreground',
  verified: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
}

export function ContributionStatusBadge({ status }: ContributionStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${contributionStyles[status]}`}
    >
      {CONTRIBUTION_STATUS_LABELS[status] ?? status}
    </span>
  )
}
