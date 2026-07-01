'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import {
  createAssistanceMethodAction,
  deleteAssistanceMethodAction,
} from '../actions/campaigns.actions'
import {
  campaignAssistanceMethodSchema,
  type CampaignAssistanceMethodValues,
} from '../schemas/campaigns.schema'
import type { CampaignAssistanceMethod } from '@/shared/types/database.types'
import { ASSISTANCE_METHOD_TYPES } from '@/shared/constants'

const TYPE_LABELS: Record<string, string> = {
  bank_transfer: 'Transferencia bancaria',
  pago_movil: 'Pago Móvil',
  cash_contact: 'Efectivo / contacto',
  physical_delivery: 'Entrega física',
}

const COUNTRY_OPTIONS = [
  { code: 'VE', label: 'Venezuela' },
  { code: 'AR', label: 'Argentina' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'ES', label: 'España' },
  { code: 'CO', label: 'Colombia' },
  { code: 'MX', label: 'México' },
  { code: 'CL', label: 'Chile' },
  { code: 'PE', label: 'Perú' },
]

function countryLabel(code: string) {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.label ?? code
}

interface CampaignAssistanceMethodsManagerProps {
  campaignId: string
  initialMethods: CampaignAssistanceMethod[]
  readOnly?: boolean
}

export function CampaignAssistanceMethodsManager({
  campaignId,
  initialMethods,
  readOnly = false,
}: CampaignAssistanceMethodsManagerProps) {
  const [methods, setMethods] = useState(initialMethods)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<CampaignAssistanceMethodValues>({
    resolver: zodResolver(campaignAssistanceMethodSchema),
    mode: 'onChange',
    defaultValues: { countryCode: 'VE', type: 'bank_transfer', isPrimary: false, isActive: true },
  })

  const type = watch('type')
  const countryCode = watch('countryCode')
  const isVenezuela = countryCode === 'VE'
  const isArgentina = countryCode === 'AR'

  function onSubmit(data: CampaignAssistanceMethodValues) {
    setError(null)
    startTransition(async () => {
      const result = await createAssistanceMethodAction(campaignId, data)
      if (!result.success) { setError(result.error); return }
      setMethods((prev) => [...prev, result.data])
      reset({ countryCode: 'VE', type: 'bank_transfer', isPrimary: false, isActive: true })
      setShowForm(false)
    })
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteAssistanceMethodAction(campaignId, id)
      if (!result.success) { setError(result.error); return }
      setMethods((prev) => prev.filter((m) => m.id !== id))
    })
  }

  function methodSummary(m: CampaignAssistanceMethod) {
    const country = m.country_code !== 'VE' ? ` · ${countryLabel(m.country_code)}` : ''
    if (m.alias) return `Alias: ${m.alias}${country}`
    const parts = [TYPE_LABELS[m.type] ?? m.type]
    if (m.account_number) parts.push(m.account_number)
    else if (m.phone) parts.push(m.phone)
    return parts.join(' · ') + country
  }

  return (
    <section className="bg-card border-border rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-foreground text-base font-medium">
            Métodos de pago ({methods.length})
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Solo visibles mediante el botón de revelado (con trazabilidad).
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            <Plus className="size-3.5" />
            Agregar
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-xl p-3 text-sm">{error}</div>
      )}

      {showForm && !readOnly && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="border-border bg-muted/30 mb-4 flex flex-col gap-3 rounded-xl border p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* País */}
            <div className="flex flex-col gap-1">
              <label className="text-foreground text-xs font-medium">País *</label>
              <select
                {...register('countryCode')}
                className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Tipo — solo para Venezuela */}
            {isVenezuela && (
              <div className="flex flex-col gap-1">
                <label className="text-foreground text-xs font-medium">Tipo *</label>
                <select
                  {...register('type')}
                  className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                >
                  {ASSISTANCE_METHOD_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Etiqueta */}
            <div className="flex flex-col gap-1">
              <label className="text-foreground text-xs font-medium">Etiqueta *</label>
              <input
                {...register('label')}
                type="text"
                placeholder={isArgentina ? 'Ej: Cuenta personal AR' : 'Ej: Banco Venezuela'}
                className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
              />
              {errors.label && <p className="text-destructive text-xs">{errors.label.message}</p>}
            </div>

            {/* Titular */}
            <div className="flex flex-col gap-1">
              <label className="text-foreground text-xs font-medium">Titular *</label>
              <input
                {...register('holderFullName')}
                type="text"
                placeholder="Nombre del beneficiario"
                className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
              />
              {errors.holderFullName && (
                <p className="text-destructive text-xs">{errors.holderFullName.message}</p>
              )}
            </div>

            {/* Argentina: solo alias */}
            {isArgentina && (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-foreground text-xs font-medium">Alias (CBU/CVU) *</label>
                <input
                  {...register('alias')}
                  type="text"
                  placeholder="Ej: nombre.apellido.mp"
                  className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
                />
              </div>
            )}

            {/* Venezuela + otros países no Argentina */}
            {!isArgentina && (
              <>
                {(isVenezuela ? type === 'bank_transfer' || type === 'pago_movil' : true) && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-foreground text-xs font-medium">Teléfono</label>
                      <input
                        {...register('phone')}
                        type="text"
                        placeholder={isVenezuela ? '04XX-XXXXXXX' : '+XX XXX XXX XXXX'}
                        className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-foreground text-xs font-medium">Banco</label>
                      <input
                        {...register('bankName')}
                        type="text"
                        placeholder="Nombre del banco"
                        className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                      />
                    </div>
                  </>
                )}
                {(!isVenezuela || type === 'bank_transfer') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-foreground text-xs font-medium">
                      {isVenezuela ? 'Número de cuenta' : 'IBAN / Cuenta'}
                    </label>
                    <input
                      {...register('accountNumber')}
                      type="text"
                      placeholder={isVenezuela ? 'XXXX-XXXX-XXXX-XXXX' : 'ESXX XXXX…'}
                      className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
                    />
                  </div>
                )}
                {isVenezuela && (
                  <div className="flex flex-col gap-1">
                    <label className="text-foreground text-xs font-medium">Cédula / RIF</label>
                    <input
                      {...register('idNumber')}
                      type="text"
                      placeholder="Opcional"
                      className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input {...register('isPrimary')} type="checkbox" className="accent-primary" />
            <span className="text-foreground">Método principal</span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); reset() }}
              className="border-border text-foreground hover:bg-muted rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !isValid}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Agregar método
            </button>
          </div>
        </form>
      )}

      {methods.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay métodos de pago configurados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {methods.map((m) => (
            <li key={m.id} className="bg-muted/40 flex items-center justify-between gap-3 rounded-xl p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-medium">{m.label}</span>
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
                <p className="text-muted-foreground text-xs">
                  {m.holder_full_name} · {methodSummary(m)}
                </p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label="Eliminar método"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
