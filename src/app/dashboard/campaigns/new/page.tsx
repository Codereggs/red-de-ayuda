import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireCampaignAdminOrAdmin } from '@/shared/lib/auth/guards'
import { CampaignForm } from '@/features/campaigns/components/campaign-form'
import { createCampaignAction } from '@/features/campaigns/actions/campaigns.actions'

export default async function NewCampaignPage() {
  await requireCampaignAdminOrAdmin()

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/dashboard/campaigns"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a campañas
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-foreground text-3xl font-medium">Crear campaña</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
        </p>
      </div>

      <CampaignForm action={createCampaignAction} mode="create" />
    </div>
  )
}
