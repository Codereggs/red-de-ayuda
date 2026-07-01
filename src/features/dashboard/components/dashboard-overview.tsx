import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  ArrowRight,
  CircleDollarSign,
  Clock3,
  FolderHeart,
  HandHeart,
  Megaphone,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { CampaignStatusBadge } from '@/features/campaigns/components/campaign-status-badge'
import type { DashboardOverview as DashboardOverviewData } from '../types/dashboard.types'

interface DashboardOverviewProps {
  data: DashboardOverviewData
  firstName: string
}

function formatDate(value: string, dateOnly = false): string {
  const date = new Date(dateOnly ? `${value}T00:00:00` : value)
  return date.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  tone: 'primary' | 'secondary' | 'accent'
}) {
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
    accent: 'bg-accent text-accent-foreground',
  }

  return (
    <article className="bg-card border-border flex flex-col gap-3 rounded-2xl border p-5">
      <div className={`flex size-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="font-display text-foreground text-2xl font-semibold">{value}</p>
        <p className="text-muted-foreground mt-0.5 text-sm">{label}</p>
      </div>
    </article>
  )
}

export function DashboardOverview({ data, firstName }: DashboardOverviewProps) {
  const { metrics, recentCases, recentHelpRecords, recentCampaigns } = data

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-muted-foreground text-sm">Bienvenido, {firstName}</p>
          <h1 className="font-display text-foreground mt-1 text-3xl font-medium">Panel</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Resumen operativo de casos verificados y ayudas registradas.
          </p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="size-4" />
          Crear caso
        </Link>
      </div>

      <section aria-labelledby="dashboard-metrics">
        <h2 id="dashboard-metrics" className="sr-only">
          Métricas principales
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Megaphone}
            label="Campañas activas"
            value={metrics.activeCampaigns}
            tone="primary"
          />
          <StatCard
            icon={TrendingUp}
            label="Recaudado (campañas)"
            value={formatUsd(metrics.totalRaisedUsd)}
            tone="primary"
          />
          <StatCard
            icon={FolderHeart}
            label="Casos activos"
            value={metrics.activeCases}
            tone="secondary"
          />
          <StatCard
            icon={Archive}
            label="Casos archivados"
            value={metrics.archivedCases}
            tone="accent"
          />
          <StatCard
            icon={HandHeart}
            label="Ayudas registradas"
            value={metrics.totalHelpRecords}
            tone="primary"
          />
          <StatCard
            icon={CircleDollarSign}
            label="Monto registrado"
            value={formatUsd(metrics.totalAmountUsd)}
            tone="primary"
          />
          <StatCard
            icon={Clock3}
            label="Casos sin ayuda"
            value={metrics.casesWithoutHelp}
            tone="accent"
          />
        </div>
      </section>

      <section className="bg-card border-border mt-8 rounded-2xl border p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-foreground text-lg font-medium">Campañas recientes</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Progreso de recaudación de las campañas en curso.
            </p>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
            No hay campañas registradas.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentCampaigns.map((campaign) => (
              <li key={campaign.id}>
                <Link
                  href={`/dashboard/campaigns/${campaign.id}`}
                  className="border-border hover:bg-muted flex flex-col gap-2 rounded-xl border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {campaign.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                        {campaign.publicCode}
                      </p>
                    </div>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>

                  <div className="mt-1">
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${campaign.progressPct}%` }}
                      />
                    </div>
                    <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-foreground font-mono font-semibold">
                        {formatUsd(campaign.raisedAmountUsd)}
                      </span>
                      <span className="font-mono">
                        {campaign.progressPct}% de {formatUsd(campaign.goalAmountUsd)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="bg-card border-border rounded-2xl border p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-foreground text-lg font-medium">Casos recientes</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">Últimos casos registrados.</p>
            </div>
            <Link
              href="/dashboard/cases"
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              Ver todos
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {recentCases.length === 0 ? (
            <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
              No hay casos registrados.
            </p>
          ) : (
            <ul className="border-border flex flex-col divide-y">
              {recentCases.map((caseItem) => (
                <li key={caseItem.id}>
                  <Link
                    href={`/dashboard/cases/${caseItem.id}`}
                    className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {caseItem.fullName}
                      </p>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {caseItem.city}, {caseItem.state}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-muted-foreground font-mono text-xs">
                        {caseItem.publicCode}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatDate(caseItem.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card border-border rounded-2xl border p-5">
          <div className="mb-4">
            <h2 className="font-display text-foreground text-lg font-medium">Ayudas recientes</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Últimos registros incorporados por el equipo.
            </p>
          </div>

          {recentHelpRecords.length === 0 ? (
            <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
              No hay ayudas registradas.
            </p>
          ) : (
            <ul className="border-border flex flex-col divide-y">
              {recentHelpRecords.map((record) => (
                <li key={record.id}>
                  <Link
                    href={`/dashboard/cases/${record.caseId}`}
                    className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                          {record.helpTypeName}
                        </span>
                        <p className="text-foreground truncate text-sm font-semibold">
                          {record.title}
                        </p>
                      </div>
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        {record.casePublicCode} · {record.caseFullName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {record.amountUsd !== null && (
                        <p className="text-secondary-foreground font-mono text-xs font-semibold">
                          {formatUsd(record.amountUsd)}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatDate(record.helpedAt, true)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
