'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CampaignProgressBar } from '@/features/campaigns/components/campaign-progress-bar'
import { CampaignStatusBadge } from '@/features/campaigns/components/campaign-status-badge'
import type { PublicCampaign } from '@/features/campaigns/types/campaigns.types'
import { RESPONSIBLE_USE_TEXT } from '@/shared/constants'
import { Eye, X } from 'lucide-react'
import type { CampaignAssistanceMethod } from '@/shared/types/database.types'

interface PublicCampaignDetailClientProps {
  campaign: PublicCampaign
  isHelper: boolean
}

const TYPE_LABELS: Record<string, string> = {
  bank_transfer: 'Transferencia bancaria',
  pago_movil: 'Pago Móvil',
  cash_contact: 'Efectivo / contacto',
  physical_delivery: 'Entrega física',
}

function PaymentMethodCard({ method }: { method: CampaignAssistanceMethod }) {
  const {
    label,
    type,
    holder_full_name: holderFullName,
    document_type: documentType,
    id_number: idNumber,
    phone,
    bank_name: bankName,
    account_type: accountType,
    account_number: accountNumber,
    alias,
    address_line: addressLine,
    address_city: addressCity,
    address_state: addressState,
    address_country: addressCountry,
    purpose,
    notes,
  } = method

  const address = [addressLine, addressCity, addressState, addressCountry]
    .filter(Boolean)
    .join(', ')

  return (
    <li className="bg-muted/40 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{label}</p>
        <span className="text-muted-foreground text-xs">{TYPE_LABELS[type]}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <dt className="text-muted-foreground">Titular</dt>
          <dd className="text-foreground">{holderFullName}</dd>
        </div>
        {idNumber && (
          <div>
            <dt className="text-muted-foreground">Documento</dt>
            <dd className="text-foreground font-mono">
              {documentType ? `${documentType}${idNumber}` : idNumber}
            </dd>
          </div>
        )}
        {phone && (
          <div>
            <dt className="text-muted-foreground">Teléfono</dt>
            <dd className="text-foreground font-mono">{phone}</dd>
          </div>
        )}
        {bankName && (
          <div>
            <dt className="text-muted-foreground">Banco</dt>
            <dd className="text-foreground">{bankName}</dd>
          </div>
        )}
        {accountType && (
          <div>
            <dt className="text-muted-foreground">Tipo de cuenta</dt>
            <dd className="text-foreground capitalize">{accountType}</dd>
          </div>
        )}
        {accountNumber && (
          <div>
            <dt className="text-muted-foreground">Cuenta</dt>
            <dd className="text-foreground font-mono">{accountNumber}</dd>
          </div>
        )}
        {alias && (
          <div>
            <dt className="text-muted-foreground">Alias</dt>
            <dd className="text-foreground font-mono">{alias}</dd>
          </div>
        )}
        {address && (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Dirección</dt>
            <dd className="text-foreground">{address}</dd>
          </div>
        )}
        {purpose && (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Propósito</dt>
            <dd className="text-foreground">{purpose}</dd>
          </div>
        )}
        {notes && (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Notas</dt>
            <dd className="text-foreground">{notes}</dd>
          </div>
        )}
      </dl>
    </li>
  )
}

export function PublicCampaignDetailClient({
  campaign,
  isHelper,
}: PublicCampaignDetailClientProps) {
  const [methods, setMethods] = useState<CampaignAssistanceMethod[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const goalReached =
    campaign.goal_amount_usd > 0 && campaign.raised_amount_usd >= campaign.goal_amount_usd

  function handleReveal() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/public/campaigns/${campaign.id}/reveal-assistance-methods`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'No se pudo obtener los datos de pago.')
        return
      }
      const data: { assistanceMethods: CampaignAssistanceMethod[] } = await res.json()
      setMethods(data.assistanceMethods)
      setRevealed(true)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border-border rounded-2xl border p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground font-mono text-xs">{campaign.public_code}</p>
            <h1 className="font-display text-foreground mt-1 text-2xl font-medium sm:text-3xl">
              {campaign.title}
            </h1>
          </div>
          <CampaignStatusBadge status={campaign.status} />
        </div>

        {campaign.description && (
          <p className="text-muted-foreground mb-4 text-sm">{campaign.description}</p>
        )}

        <CampaignProgressBar
          raisedAmountUsd={campaign.raised_amount_usd}
          goalAmountUsd={campaign.goal_amount_usd}
          progressPct={campaign.progressPct}
        />
      </div>

      {campaign.helper_contact_url && (
        <section className="bg-primary/5 border-primary/20 rounded-2xl border p-6">
          <h2 className="font-display text-foreground text-base font-medium">
            ¿Quieres sumarte como helper?
          </h2>
          {campaign.helper_contact_note && (
            <p className="text-muted-foreground mt-2 text-sm">{campaign.helper_contact_note}</p>
          )}
          <a
            href={campaign.helper_contact_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Solicitar acceso
          </a>
        </section>
      )}

      {campaign.images.length > 0 && (
        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-4 text-base font-medium">
            Galería ({campaign.images.length})
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {campaign.images.map((img) => (
              <li key={img.id} className="aspect-square overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.publicUrl}
                  alt="Imagen de la campaña"
                  loading="lazy"
                  onClick={() => setPreviewUrl(img.publicUrl)}
                  className="size-full cursor-pointer object-cover transition-transform hover:scale-105"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {campaign.members.length > 0 && (
        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-4 text-base font-medium">
            Personas incluidas ({campaign.members.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {campaign.members.map((member) => (
              <li key={member.caseId} className="bg-muted/40 rounded-xl p-3">
                <p className="text-foreground text-sm font-medium">{member.fullName}</p>
                {member.needs.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1">
                    {member.needs.map((need) => (
                      <div key={need.id} className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            need.purchased_at
                              ? 'bg-muted text-muted-foreground line-through'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {need.needCategoryName}
                        </span>
                        {need.price_usd > 0 && (
                          <span className="text-muted-foreground font-mono text-xs">
                            ${need.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isHelper && goalReached && (
        <section className="bg-primary/5 border-primary/20 rounded-2xl border p-6 text-center">
          <p className="text-2xl" aria-hidden>🎉</p>
          <h2 className="font-display text-foreground mt-2 text-lg font-medium">
            ¡Meta completada!
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Esta campaña ya alcanzó su objetivo de recaudación. Gracias por tu solidaridad y tu
            aporte 💚 Te invitamos a apoyar otra campaña activa que aún necesita ayuda.
          </p>
          <Link
            href="/campaigns"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Ver otras campañas
          </Link>
        </section>
      )}

      {isHelper && !goalReached && (
        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-3 text-base font-medium">
            Datos de pago
          </h2>
          {!revealed ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">{RESPONSIBLE_USE_TEXT}</p>
              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
              <button
                type="button"
                onClick={handleReveal}
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Eye className="size-4" />
                {isPending ? 'Cargando…' : 'Revelar datos de pago'}
              </button>
            </div>
          ) : methods && methods.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {methods.map((method) => (
                <PaymentMethodCard key={method.id} method={method} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No hay métodos de pago configurados.</p>
          )}
        </section>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Imagen de la campaña"
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
