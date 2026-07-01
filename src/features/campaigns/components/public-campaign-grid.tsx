import { PublicCampaignCard } from './public-campaign-card'
import type { PublicCampaign } from '../types/campaigns.types'

interface PublicCampaignGridProps {
  campaigns: PublicCampaign[]
}

export function PublicCampaignGrid({ campaigns }: PublicCampaignGridProps) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-card border-border rounded-2xl border p-12 text-center">
        <p className="text-muted-foreground text-sm">No hay campañas activas en este momento.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <PublicCampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  )
}
