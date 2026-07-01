import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCampaignsRepository } from '@/features/campaigns/repositories/campaigns.repository'
import { getSession, isActiveHelperOrAdmin } from '@/shared/lib/auth/get-session'
import { PublicCampaignDetailClient } from './public-campaign-detail-client'

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PublicCampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params

  const client = await createServerSupabaseClient()
  const repo = createCampaignsRepository(client)
  const [campaign, session] = await Promise.all([repo.findPublicById(id), getSession()])

  if (!campaign) notFound()

  const isHelper = isActiveHelperOrAdmin(session)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/campaigns"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a campañas
      </Link>

      <PublicCampaignDetailClient campaign={campaign} isHelper={isHelper} />
    </main>
  )
}
