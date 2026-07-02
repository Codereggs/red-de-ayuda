'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, ExternalLink, CheckCircle, XCircle, Trash2, Loader2 } from 'lucide-react'
import { ContributionFormModal } from './contribution-form-modal'
import { ContributionStatusBadge } from './campaign-status-badge'
import {
  verifyContributionAction,
  rejectContributionAction,
  deleteContributionAction,
  getReceiptSignedUrlAction,
} from '../actions/campaigns.actions'
import type { ContributionWithCreator } from '../types/campaigns.types'
import type { CampaignContribution } from '@/shared/types/database.types'
import { useSearchPager, SearchBox, Pager } from '@/shared/components/list-search-pager'

interface ContributionsManagerProps {
  campaignId: string
  initialContributions: ContributionWithCreator[]
  readOnly?: boolean
  canManage?: boolean
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount)
}

export function ContributionsManager({
  campaignId,
  initialContributions,
  readOnly = false,
  canManage = true,
}: ContributionsManagerProps) {
  const [contributions, setContributions] =
    useState<ContributionWithCreator[]>(initialContributions)
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleNewContribution(contribution: CampaignContribution) {
    const enriched: ContributionWithCreator = { ...contribution, createdBy: null, verifiedBy: null }
    setContributions((prev) => [enriched, ...prev])
  }

  function handleVerify(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await verifyContributionAction(campaignId, id)
      if (!result.success) { setError(result.error); toast.error(result.error); return }
      setContributions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'verified' as const } : c)),
      )
      toast.success('Aporte verificado.')
    })
  }

  function handleReject(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await rejectContributionAction(campaignId, id)
      if (!result.success) { setError(result.error); toast.error(result.error); return }
      setContributions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'rejected' as const } : c)),
      )
      toast.success('Aporte rechazado.')
    })
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteContributionAction(campaignId, id)
      if (!result.success) { setError(result.error); toast.error(result.error); return }
      setContributions((prev) => prev.filter((c) => c.id !== id))
      toast.success('Aporte eliminado.')
    })
  }

  async function handleViewReceipt(path: string) {
    const result = await getReceiptSignedUrlAction(path)
    if (!result.success) { setError(result.error); toast.error(result.error); return }
    window.open(result.data.url, '_blank', 'noopener,noreferrer')
  }

  const pager = useSearchPager({
    items: contributions,
    pageSize: 3,
    searchThreshold: 4,
    filterFn: (c, q) =>
      (c.contributor_name?.toLowerCase().includes(q) ?? false) ||
      (c.reference?.toLowerCase().includes(q) ?? false) ||
      String(c.amount_usd).includes(q),
  })

  return (
    <section className="bg-card border-border rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-foreground text-base font-medium">
            Aportes ({contributions.length})
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Solo los verificados suman a la barra de progreso.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            <Plus className="size-3.5" />
            Registrar aporte
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-xl p-3 text-sm">{error}</div>
      )}

      {contributions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay aportes registrados aún.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pager.showSearch && (
            <SearchBox
              value={pager.query}
              onChange={pager.setQuery}
              placeholder="Buscar por donante, referencia o monto…"
            />
          )}
          {pager.filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin resultados para “{pager.query.trim()}”.</p>
          ) : (
          <div className="bg-card border-border overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/40 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Fecha</th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Monto</th>
                <th className="text-muted-foreground hidden px-4 py-3 text-left text-xs font-medium sm:table-cell">Donante</th>
                <th className="text-muted-foreground hidden px-4 py-3 text-left text-xs font-medium md:table-cell">Referencia</th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {pager.pageItems.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                    {formatDate(c.transferred_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground font-mono text-sm font-semibold">
                      {formatUsd(c.amount_usd)}
                    </span>
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 text-xs sm:table-cell">
                    {c.contributor_name ?? '—'}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 font-mono text-xs md:table-cell">
                    {c.reference ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ContributionStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {c.receipt_image_path && (
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(c.receipt_image_path!)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Ver comprobante"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                      )}
                      {!readOnly && canManage && c.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVerify(c.id)}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                            title="Verificar"
                          >
                            {isPending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(c.id)}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            title="Rechazar"
                          >
                            <XCircle className="size-3.5" />
                          </button>
                        </>
                      )}
                      {!readOnly && canManage && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={isPending}
                          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}
          {pager.showPager && (
            <Pager
              page={pager.page}
              totalPages={pager.totalPages}
              start={pager.start}
              pageSize={pager.pageSize}
              total={pager.filtered.length}
              onPageChange={pager.setPage}
            />
          )}
        </div>
      )}

      {showModal && (
        <ContributionFormModal
          campaignId={campaignId}
          onSuccess={handleNewContribution}
          onClose={() => setShowModal(false)}
        />
      )}
    </section>
  )
}
