'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Archive } from 'lucide-react'
import { CampaignStatusBadge } from '@/features/campaigns/components/campaign-status-badge'
import { CampaignProgressBar } from '@/features/campaigns/components/campaign-progress-bar'
import { CampaignMembersManager } from '@/features/campaigns/components/campaign-members-manager'
import { ContributionsManager } from '@/features/campaigns/components/contributions-manager'
import { CampaignAssistanceMethodsManager } from '@/features/campaigns/components/campaign-assistance-methods-manager'
import { CampaignImagesManager } from '@/features/campaigns/components/campaign-images-manager'
import { ArchiveCampaignModal } from '@/features/campaigns/components/archive-campaign-modal'
import { updateCampaignStatusAction } from '@/features/campaigns/actions/campaigns.actions'
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS } from '@/shared/constants'
import type { Campaign, CampaignAssistanceMethod, NeedCategory } from '@/shared/types/database.types'
import type {
  PublicCampaignMember,
  ContributionWithCreator,
  CampaignImage,
} from '@/features/campaigns/types/campaigns.types'

interface CampaignDetailClientProps {
  campaign: Campaign
  members: PublicCampaignMember[]
  contributions: ContributionWithCreator[]
  assistanceMethods: CampaignAssistanceMethod[]
  needCategories: NeedCategory[]
  images: CampaignImage[]
  progressPct: number
  isCampaignAdminOrAdmin: boolean
}

export function CampaignDetailClient({
  campaign,
  members,
  contributions,
  assistanceMethods,
  needCategories,
  images,
  progressPct,
  isCampaignAdminOrAdmin,
}: CampaignDetailClientProps) {
  const isArchived = !!campaign.archived_at
  const [showArchive, setShowArchive] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(campaign.status)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(newStatus: Campaign['status']) {
    startTransition(async () => {
      const result = await updateCampaignStatusAction(campaign.id, { status: newStatus })
      if (result.success) setCurrentStatus(newStatus)
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/dashboard/campaigns"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a campañas
      </Link>

      <div className="bg-card border-border mb-6 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-mono text-xs">{campaign.public_code}</p>
            <h1 className="font-display text-foreground mt-1 text-2xl font-medium sm:text-3xl">
              {campaign.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <CampaignStatusBadge status={currentStatus} />
              {campaign.verified && (
                <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  Verificada
                </span>
              )}
              {isArchived && (
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  Archivada
                </span>
              )}
            </div>
          </div>
          {isCampaignAdminOrAdmin && (
            <div className="flex gap-2">
              {!isArchived && (
                <>
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}/edit`}
                    className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm transition-colors"
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowArchive(true)}
                    className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm transition-colors"
                  >
                    <Archive className="size-4" />
                    Archivar
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-5">
          <CampaignProgressBar
            raisedAmountUsd={campaign.raised_amount_usd}
            goalAmountUsd={campaign.goal_amount_usd}
            progressPct={progressPct}
          />
        </div>

        {campaign.description && (
          <p className="text-muted-foreground mt-4 text-sm">{campaign.description}</p>
        )}

        {!isArchived && isCampaignAdminOrAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">Cambiar estado:</span>
            {CAMPAIGN_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusChange(s)}
                disabled={isPending || s === currentStatus}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                  s === currentStatus
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border border text-muted-foreground hover:bg-muted'
                }`}
              >
                {CAMPAIGN_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      <ContributionsManager
        campaignId={campaign.id}
        initialContributions={contributions}
        readOnly={isArchived}
        canManage={isCampaignAdminOrAdmin}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CampaignMembersManager
          campaignId={campaign.id}
          initialMembers={members}
          needCategories={needCategories}
          readOnly={isArchived || !isCampaignAdminOrAdmin}
        />
        <CampaignAssistanceMethodsManager
          campaignId={campaign.id}
          initialMethods={assistanceMethods}
          readOnly={isArchived || !isCampaignAdminOrAdmin}
        />
      </div>

      <div className="mt-6">
        <CampaignImagesManager
          campaignId={campaign.id}
          initialImages={images}
          readOnly={isArchived || !isCampaignAdminOrAdmin}
        />
      </div>

      {isArchived && campaign.archive_reason && (
        <div className="bg-card border-border mt-6 rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-2 text-base font-medium">
            Motivo de archivo
          </h2>
          <p className="text-foreground text-sm">{campaign.archive_reason}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Archivada el{' '}
            {new Date(campaign.archived_at!).toLocaleDateString('es-VE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}

      {showArchive && (
        <ArchiveCampaignModal
          campaignId={campaign.id}
          campaignTitle={campaign.title}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  )
}
