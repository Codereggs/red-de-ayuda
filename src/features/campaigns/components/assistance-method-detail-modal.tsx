'use client'

import { X, Copy, Check } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { CampaignAssistanceMethod } from '@/shared/types/database.types'
import { CountryFlag } from '@/shared/components/country-flag'
import {
  typeLabel,
  countryLabel,
  accountTypeLabel,
  documentLabel,
  fullAddress,
} from '../utils/assistance-method-display'

interface AssistanceMethodDetailModalProps {
  method: CampaignAssistanceMethod
  onClose: () => void
}

function Field({
  label,
  value,
  mono,
  copyable,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className={`text-foreground text-sm ${mono ? 'font-mono' : ''} break-words`}>{value}</dd>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-primary mt-0.5 shrink-0 transition-colors"
          aria-label={`Copiar ${label}`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-border border-t pt-3 first:border-t-0 first:pt-0">
      <p className="text-foreground mb-1 text-xs font-semibold uppercase tracking-wide">{title}</p>
      <dl className="divide-border divide-y">{children}</dl>
    </div>
  )
}

export function AssistanceMethodDetailModal({ method: m, onClose }: AssistanceMethodDetailModalProps) {
  const doc = documentLabel(m)
  const address = fullAddress(m)
  const accType = accountTypeLabel(m.account_type)

  const hasAccount = !!(m.bank_name || m.account_number || accType || m.alias)
  const hasAddress = !!address

  // Copy full WhatsApp-ready summary
  const [copiedAll, setCopiedAll] = useState(false)
  function handleCopyAll() {
    const lines = [
      `📤 ${m.label}`,
      `País: ${countryLabel(m.country_code)}`,
      `Tipo: ${typeLabel(m.type)}`,
      `Titular: ${m.holder_full_name}`,
      doc ? `Documento: ${doc}` : null,
      m.phone ? `Teléfono: ${m.phone}` : null,
      m.bank_name ? `Banco: ${m.bank_name}` : null,
      accType ? `Tipo de cuenta: ${accType}` : null,
      m.account_number ? `N° de cuenta: ${m.account_number}` : null,
      m.alias ? `Alias: ${m.alias}` : null,
      address ? `Dirección: ${address}` : null,
      m.purpose ? `Propósito: ${m.purpose}` : null,
      m.notes ? `Notas: ${m.notes}` : null,
    ].filter(Boolean)
    void navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1500)
    })
  }

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
            <div className="flex items-center gap-2">
              <CountryFlag
                code={m.country_code}
                title={countryLabel(m.country_code)}
                className="h-4 w-6 shrink-0 rounded-sm shadow-sm"
              />
              <h3 className="text-foreground font-display truncate font-semibold">{m.label}</h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {countryLabel(m.country_code)}
              </span>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {typeLabel(m.type)}
              </span>
              {m.is_primary && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                  Principal
                </span>
              )}
              {!m.is_active && (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                  Inactivo
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 overflow-y-auto p-5">
          <Section title="Destinatario">
            <Field label="Titular" value={m.holder_full_name} />
            {doc && <Field label="Documento" value={doc} mono copyable />}
            {m.phone && <Field label="Teléfono" value={m.phone} mono copyable />}
          </Section>

          {hasAccount && (
            <Section title="Cuenta">
              {m.bank_name && <Field label="Banco" value={m.bank_name} />}
              {accType && <Field label="Tipo de cuenta" value={accType} />}
              {m.account_number && (
                <Field label="Número de cuenta" value={m.account_number} mono copyable />
              )}
              {m.alias && <Field label="Alias" value={m.alias} mono copyable />}
            </Section>
          )}

          {hasAddress && (
            <Section title="Dirección">
              <Field label="Dirección completa" value={address!} copyable />
            </Section>
          )}

          {(m.purpose || m.notes) && (
            <Section title="Otros">
              {m.purpose && <Field label="Propósito" value={m.purpose} />}
              {m.notes && <Field label="Notas" value={m.notes} />}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="border-border border-t p-4">
          <button
            type="button"
            onClick={handleCopyAll}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            {copiedAll ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiedAll ? 'Copiado' : 'Copiar datos (WhatsApp)'}
          </button>
        </div>
      </div>
    </div>
  )
}
