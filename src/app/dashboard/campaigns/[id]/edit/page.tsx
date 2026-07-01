import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { requireCampaignAdminOrAdmin } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCampaignsRepository } from '@/features/campaigns/repositories/campaigns.repository'
import { CampaignForm } from '@/features/campaigns/components/campaign-form'
import { updateCampaignAction } from '@/features/campaigns/actions/campaigns.actions'

interface EditCampaignPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = await params
  await requireCampaignAdminOrAdmin()

  const client = await createServerSupabaseClient()
  const repo = createCampaignsRepository(client)
  const campaign = await repo.findPrivateById(id)

  if (!campaign) notFound()

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/dashboard/campaigns/${id}`}
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a la campaña
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-foreground text-3xl font-medium">Editar campaña</h1>
        <p className="text-muted-foreground mt-1 font-mono text-xs">{campaign.public_code}</p>
      </div>

      <CampaignForm
        action={updateCampaignAction.bind(null, id)}
        defaultValues={{
          title: campaign.title,
          description: campaign.description ?? undefined,
          goalAmountUsd: campaign.goal_amount_usd,
          helperContactUrl: campaign.helper_contact_url ?? undefined,
          helperContactNote: campaign.helper_contact_note ?? undefined,
        }}
        mode="edit"
      />
    </div>
  )
}
