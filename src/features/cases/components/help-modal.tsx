'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Phone, Loader2, AlertCircle, Copy, MapPin } from 'lucide-react'
import { RESPONSIBLE_USE_TEXT } from '@/shared/constants'
import type { PublicCase, RevealAssistancePayload } from '../types/cases.types'
import type { AssistanceMethod } from '@/shared/types/database.types'
import { buildAssistanceMethodCopy } from '../utils/case-copy'

interface HelpModalProps {
  caseData: PublicCase
  isHelper: boolean
  onClose: () => void
}

const METHOD_LABELS: Record<AssistanceMethod['type'], string> = {
  bank_transfer: 'Transferencia bancaria',
  pago_movil: 'Pago Móvil',
  cash_contact: 'Efectivo (contacto directo)',
  physical_delivery: 'Entrega física',
}

type Step = 'confirm' | 'loading' | 'revealed' | 'error'

export function HelpModal({ caseData, isHelper, onClose }: HelpModalProps) {
  const [step, setStep] = useState<Step>('confirm')
  const [payload, setPayload] = useState<RevealAssistancePayload | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleConfirm() {
    setStep('loading')
    try {
      const res = await fetch(`/api/public/cases/${caseData.id}/reveal-assistance-methods`, {
        method: 'POST',
      })
      const body = await res.json()
      if (!res.ok) {
        setErrorMsg(
          res.status === 401
            ? 'Debes iniciar sesión como helper para ver los datos de contacto.'
            : (body.error ?? 'Error al obtener los datos.'),
        )
        setStep('error')
        return
      }
      setPayload(body as RevealAssistancePayload)
      setStep('revealed')
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
      setStep('error')
    }
  }

  async function copyMethod(method: AssistanceMethod) {
    await navigator.clipboard.writeText(buildAssistanceMethodCopy(caseData, method))
    await fetch('/api/public/assistance-access-log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        caseId: caseData.id,
        assistanceMethodId: method.id,
        action: 'copied',
      }),
    })
  }

  return (
    <div
      className="bg-foreground/30 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl shadow-xl">
        <div className="border-border flex items-center justify-between border-b p-6">
          <div>
            <h2 className="font-display text-foreground text-xl font-medium">Ayudar</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{caseData.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-muted text-muted-foreground rounded-lg p-2 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'confirm' && (
            <div className="flex flex-col gap-5">
              <div className="bg-muted flex flex-col gap-3 rounded-xl p-4">
                <p className="text-foreground text-sm font-semibold">{caseData.short_description}</p>
                <p className="text-muted-foreground flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {caseData.public_contact_place}
                </p>
                {caseData.needs.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {caseData.needs.map((need) => (
                      <li
                        key={need.id}
                        className="bg-background text-foreground rounded-full px-2.5 py-1 text-xs"
                      >
                        {need.category.name} ×{need.quantity}
                        {need.unit ? ` ${need.unit}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-foreground text-sm leading-relaxed">{RESPONSIBLE_USE_TEXT}</p>
              {isHelper ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-full py-2.5 font-semibold transition-colors"
                >
                  Ver datos para ayudar
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground text-sm">
                    Debes iniciar sesión como helper para ver los datos de contacto.
                  </p>
                  <Link
                    href="/login"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center rounded-full py-2.5 text-sm font-semibold transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              )}
            </div>
          )}

          {step === 'loading' && (
            <div className="text-muted-foreground flex flex-col items-center gap-3 py-8">
              <Loader2 className="text-primary size-7 animate-spin" />
              <p className="text-sm">Cargando datos de contacto…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col gap-4">
              <div className="bg-destructive/10 text-destructive flex items-start gap-3 rounded-xl p-4">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <p className="text-sm">{errorMsg}</p>
              </div>
              <button
                onClick={() => setStep('confirm')}
                className="text-primary text-sm underline underline-offset-2"
              >
                Volver a intentar
              </button>
            </div>
          )}

          {step === 'revealed' && payload && (
            <div className="flex flex-col gap-6">
              {payload.phones.length > 0 && (
                <section>
                  <h3 className="font-display text-foreground mb-3 flex items-center gap-2 text-base font-medium">
                    <Phone className="text-primary size-4" />
                    Teléfonos de contacto
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {payload.phones.map((p) => (
                      <li
                        key={p.id}
                        className="bg-muted flex items-center justify-between rounded-xl p-3"
                      >
                        <div>
                          <p className="text-foreground font-mono text-sm font-medium">{p.phone}</p>
                          {p.label && (
                            <p className="text-muted-foreground mt-0.5 text-xs">{p.label}</p>
                          )}
                        </div>
                        {p.is_primary && (
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                            Principal
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {payload.assistanceMethods.length > 0 && (
                <section>
                  <h3 className="font-display text-foreground mb-3 text-base font-medium">
                    Métodos de asistencia
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {payload.assistanceMethods.map((m) => (
                      <li key={m.id} className="bg-muted flex flex-col gap-2 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-primary text-xs font-semibold">
                            {METHOD_LABELS[m.type]}
                          </span>
                          {m.is_primary && (
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-foreground text-sm font-medium">{m.label}</p>
                        <AssistanceMethodDetails method={m} />
                        <button
                          type="button"
                          onClick={() => void copyMethod(m)}
                          className="border-primary text-primary hover:bg-primary/10 mt-2 inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                        >
                          <Copy className="size-4" />
                          Copiar datos
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {payload.phones.length === 0 && payload.assistanceMethods.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No hay datos de contacto registrados para este caso.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AssistanceMethodDetails({ method: m }: { method: AssistanceMethod }) {
  const rows: { label: string; value: string }[] = []

  rows.push({ label: 'Titular', value: m.holder_full_name })
  rows.push({ label: 'Cédula', value: m.id_number })
  rows.push({ label: 'Teléfono', value: m.phone })

  if (m.type === 'bank_transfer') {
    if (m.bank_name) rows.push({ label: 'Banco', value: m.bank_name })
    if (m.account_type) rows.push({ label: 'Tipo de cuenta', value: m.account_type })
    if (m.account_number) rows.push({ label: 'Número de cuenta', value: m.account_number })
  }

  if (m.type === 'pago_movil') {
    if (m.bank_name) rows.push({ label: 'Banco', value: m.bank_name })
  }

  rows.push({ label: 'Dirección anterior', value: m.previous_full_address })
  rows.push({ label: 'Dirección actual', value: m.current_full_address })

  if (m.notes) rows.push({ label: 'Notas', value: m.notes })

  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
      {rows.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-foreground font-mono break-all">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
