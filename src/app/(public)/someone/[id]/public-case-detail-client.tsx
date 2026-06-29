'use client'

import { useState } from 'react'
import { MapPin, Calendar, Users, Copy } from 'lucide-react'
import type { PublicCase } from '@/features/cases/types/cases.types'
import { HelpModal } from '@/features/cases/components/help-modal'
import { buildPublicCaseCopy } from '@/features/cases/utils/case-copy'
import { PublicHelpHistory } from '@/features/help-records/components/public-help-history'
import type { PublicHelpRecord } from '@/features/help-records/types/help-records.types'

interface PublicCaseDetailClientProps {
  case: PublicCase
  helpRecords: PublicHelpRecord[]
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function PublicCaseDetailClient({ case: c, helpRecords }: PublicCaseDetailClientProps) {
  const [showHelp, setShowHelp] = useState(false)

  async function copyCard() {
    await navigator.clipboard.writeText(buildPublicCaseCopy(c, window.location.origin))
  }

  return (
    <>
      <article className="flex flex-col gap-6">
        {/* Header */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground font-mono text-xs">{c.public_code}</p>
              <h1 className="font-display text-foreground mt-1 text-2xl font-medium sm:text-3xl">
                {c.full_name}
              </h1>
            </div>
            <span className="bg-secondary/60 text-secondary-foreground rounded-full px-3 py-1.5 text-sm font-semibold">
              {c.situation.name}
            </span>
          </div>

          <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {c.city}, {c.state}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {c.case_type === 'person' ? 'Persona' : 'Familia'}
            </span>
            {c.last_helped_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" />
                Última ayuda: {formatDate(c.last_helped_at)}
              </span>
            )}
          </div>

          {c.helpRecordsCount > 0 && (
            <p className="text-muted-foreground mt-2 text-sm">
              {c.helpRecordsCount}{' '}
              {c.helpRecordsCount === 1 ? 'ayuda registrada' : 'ayudas registradas'}
            </p>
          )}
        </div>

        {/* Notas públicas */}
        {c.public_notes && (
          <div className="bg-card border-border rounded-2xl border p-6">
            <h2 className="font-display text-foreground mb-2 text-base font-medium">Descripción</h2>
            <p className="text-foreground text-sm leading-relaxed">{c.public_notes}</p>
          </div>
        )}

        <div className="bg-card border-border rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-2 text-base font-medium">
            Lugar de contacto
          </h2>
          <p className="text-foreground flex items-start gap-2 text-sm leading-relaxed">
            <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
            {c.public_contact_place}
          </p>
        </div>

        {/* Necesidades */}
        {c.needs.length > 0 && (
          <div className="bg-card border-border rounded-2xl border p-6">
            <h2 className="font-display text-foreground mb-3 text-base font-medium">Necesidades</h2>
            <ul className="flex flex-wrap gap-2">
              {c.needs.map((need) => (
                <li
                  key={need.id}
                  className="bg-muted text-foreground flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{need.category.name}</span>
                  {need.quantity && (
                    <span className="text-muted-foreground font-mono text-xs">
                      ×{need.quantity}
                      {need.unit ? ` ${need.unit}` : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <PublicHelpHistory records={helpRecords} />

        {/* CTA */}
        <div className="bg-card border-border flex flex-col items-start justify-between gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-foreground font-medium">¿Puedes ayudar?</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Los datos de contacto se muestran tras confirmar el uso responsable.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyCard()}
              className="border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <Copy className="size-4" />
              Copiar ficha
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Ayudar
            </button>
          </div>
        </div>
      </article>

      {showHelp && <HelpModal caseData={c} onClose={() => setShowHelp(false)} />}
    </>
  )
}
