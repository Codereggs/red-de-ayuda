'use client'

import { useEffect, useState } from 'react'
import { X, Pencil, Check, Loader2 } from 'lucide-react'
import { getCampaignMemberDetailAction } from '../actions/campaigns.actions'
import type { PublicCampaignMember } from '../types/campaigns.types'

interface MemberDetailModalProps {
  campaignId: string
  member: PublicCampaignMember
  readOnly: boolean
  onClose: () => void
  onEdit: () => void
  onTogglePurchased?: (needId: string, currentlyPurchased: boolean) => void
}

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function MemberDetailModal({
  campaignId,
  member,
  readOnly,
  onClose,
  onEdit,
  onTogglePurchased,
}: MemberDetailModalProps) {
  const [detail, setDetail] = useState<{ idNumber: string | null; privateNotes: string | null } | null>(
    null,
  )
  const [loadingDetail, setLoadingDetail] = useState(true)

  useEffect(() => {
    let active = true
    setLoadingDetail(true)
    void getCampaignMemberDetailAction(campaignId, member.caseId).then((res) => {
      if (!active) return
      if (res.success) setDetail(res.data)
      setLoadingDetail(false)
    })
    return () => { active = false }
  }, [campaignId, member.caseId])

  const total = member.needs.reduce((s, n) => s + n.price_usd, 0)
  const purchasedTotal = member.needs
    .filter((n) => n.purchased_at)
    .reduce((s, n) => s + n.price_usd, 0)
  const purchasedCount = member.needs.filter((n) => n.purchased_at).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border-border flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-border flex items-start justify-between gap-3 border-b p-5">
          <div className="min-w-0">
            <h3 className="text-foreground font-display truncate font-semibold">{member.fullName}</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {member.needs.length} necesidad(es) · {purchasedCount}/{member.needs.length} comprado
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!readOnly && (
              <button
                type="button"
                onClick={onEdit}
                className="text-muted-foreground hover:text-primary p-1 transition-colors"
                aria-label="Editar miembro"
              >
                <Pencil className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          {/* Datos privados */}
          <div>
            <p className="text-foreground mb-1 text-xs font-semibold uppercase tracking-wide">Datos</p>
            {loadingDetail ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-3.5 animate-spin" /> Cargando…
              </p>
            ) : (
              <dl className="divide-border divide-y">
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground text-xs">Cédula</dt>
                  <dd className="text-foreground font-mono text-sm">{detail?.idNumber || '—'}</dd>
                </div>
                {detail?.privateNotes && (
                  <div className="py-2">
                    <dt className="text-muted-foreground text-xs">Notas privadas</dt>
                    <dd className="text-foreground mt-0.5 text-sm">{detail.privateNotes}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Necesidades */}
          <div>
            <p className="text-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Necesidades
            </p>
            {member.needs.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin necesidades registradas.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {member.needs.map((need) => {
                  const purchased = !!need.purchased_at
                  return (
                    <li key={need.id} className="flex items-center gap-2">
                      {onTogglePurchased ? (
                        <button
                          type="button"
                          onClick={() => onTogglePurchased(need.id, purchased)}
                          className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            purchased
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-input bg-background'
                          }`}
                          aria-label={purchased ? 'Marcar como pendiente' : 'Marcar como comprado'}
                        >
                          {purchased && <Check className="size-2.5" />}
                        </button>
                      ) : (
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                            purchased ? 'bg-primary border-primary' : 'border-input bg-background'
                          }`}
                        >
                          {purchased && <Check className="text-primary-foreground size-2.5" />}
                        </span>
                      )}
                      <span
                        className={`flex-1 text-sm ${purchased ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                      >
                        {need.needCategoryName}
                      </span>
                      {need.price_usd > 0 && (
                        <span className="text-muted-foreground font-mono text-xs">
                          {usd(need.price_usd)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer totals */}
        {total > 0 && (
          <div className="border-border text-muted-foreground flex items-center justify-between border-t p-4 text-xs">
            <span className="font-mono text-foreground">
              {usd(purchasedTotal)} <span className="text-muted-foreground">comprado</span>
            </span>
            <span className="font-mono">Total: {usd(total)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
