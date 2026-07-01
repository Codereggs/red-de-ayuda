import Link from 'next/link'
import { CampaignProgressBar } from './campaign-progress-bar'
import { CampaignStatusBadge } from './campaign-status-badge'
import type { PublicCampaign } from '../types/campaigns.types'

interface PublicCampaignCardProps {
  campaign: PublicCampaign
}

export function PublicCampaignCard({ campaign }: PublicCampaignCardProps) {
  const memberCount = campaign.members.length

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="bg-card border-border hover:border-primary/40 flex flex-col gap-4 rounded-2xl border p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground font-mono text-xs">{campaign.public_code}</p>
          <h3 className="font-display text-foreground mt-1 truncate text-base font-medium">
            {campaign.title}
          </h3>
          {campaign.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {campaign.description}
            </p>
          )}
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      <CampaignProgressBar
        raisedAmountUsd={campaign.raised_amount_usd}
        goalAmountUsd={campaign.goal_amount_usd}
        progressPct={campaign.progressPct}
      />

      {memberCount > 0 && (
        <p className="text-muted-foreground text-xs">
          {memberCount} {memberCount === 1 ? 'persona' : 'personas'} incluidas
        </p>
      )}
    </Link>
  )
}
