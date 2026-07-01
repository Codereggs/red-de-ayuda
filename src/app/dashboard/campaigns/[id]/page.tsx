import { notFound } from 'next/navigation'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCampaignsRepository } from '@/features/campaigns/repositories/campaigns.repository'
import { createNeedsRepository } from '@/features/needs/repositories/needs.repository'
import { CampaignDetailClient } from './campaign-detail-client'

interface CampaignPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: CampaignPageProps) {
  const { id } = await params
  const { profile } = await requireAuth()
  const isCampaignAdminOrAdmin = profile.role === 'admin' || profile.role === 'campaign_admin'
  const isAdmin = profile.role === 'admin'

  const client = await createServerSupabaseClient()
  const repo = createCampaignsRepository(client)
  const needsRepo = createNeedsRepository(client)

  const [campaign, contributions, assistanceMethods, needCategories, publicCampaign, images] =
    await Promise.all([
      repo.findPrivateById(id),
      repo.listContributions(id),
      repo.listAssistanceMethods(id),
      needsRepo.listCategories(),
      repo.findPublicById(id),
      repo.listCampaignImages(id),
    ])

  if (!campaign) notFound()

  const members = publicCampaign?.members ?? []
  const progressPct =
    campaign.goal_amount_usd > 0
      ? Math.min(100, Math.round((campaign.raised_amount_usd / campaign.goal_amount_usd) * 100))
      : 0

  return (
    <CampaignDetailClient
      campaign={campaign}
      members={members}
      contributions={contributions}
      assistanceMethods={assistanceMethods}
      needCategories={needCategories}
      images={images}
      progressPct={progressPct}
      isCampaignAdminOrAdmin={isCampaignAdminOrAdmin}
      isAdmin={isAdmin}
    />
  )
}
