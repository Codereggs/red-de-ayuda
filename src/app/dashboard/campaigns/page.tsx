import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCampaignsRepository } from '@/features/campaigns/repositories/campaigns.repository'
import { CampaignStatusBadge } from '@/features/campaigns/components/campaign-status-badge'
import { CampaignProgressBar } from '@/features/campaigns/components/campaign-progress-bar'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function CampaignsPage() {
  await requireAuth()

  const client = await createServerSupabaseClient()
  const repo = createCampaignsRepository(client)
  const result = await repo.listPrivate({ includeArchived: false })
  const campaigns = result.data

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-foreground text-3xl font-medium">Campañas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {campaigns.length} {campaigns.length === 1 ? 'campaña' : 'campañas'} activas
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" />
          Nueva campaña
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-card border-border rounded-2xl border p-12 text-center">
          <p className="text-muted-foreground text-sm">No hay campañas registradas aún.</p>
          <Link
            href="/dashboard/campaigns/new"
            className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <Plus className="size-4" />
            Crear la primera campaña
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campaigns/${c.id}`}
              className="bg-card border-border hover:border-primary/40 flex flex-col gap-3 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">{c.public_code}</span>
                  <CampaignStatusBadge status={c.status} />
                  {c.archived_at && (
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                      Archivada
                    </span>
                  )}
                </div>
                <h2 className="font-display text-foreground mt-1 truncate text-base font-medium">
                  {c.title}
                </h2>
                <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                  Creada {formatDate(c.created_at)}
                </p>
              </div>
              <div className="sm:w-56 shrink-0">
                <CampaignProgressBar
                  raisedAmountUsd={c.raised_amount_usd}
                  goalAmountUsd={c.goal_amount_usd}
                  progressPct={
                    c.goal_amount_usd > 0
                      ? Math.min(
                          100,
                          Math.round((c.raised_amount_usd / c.goal_amount_usd) * 100),
                        )
                      : 0
                  }
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
