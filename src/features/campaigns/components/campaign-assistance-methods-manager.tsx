'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2, ChevronRight, Pencil } from 'lucide-react'
import {
  createAssistanceMethodAction,
  updateAssistanceMethodAction,
  deleteAssistanceMethodAction,
} from '../actions/campaigns.actions'
import {
  campaignAssistanceMethodSchema,
  type CampaignAssistanceMethodValues,
} from '../schemas/campaigns.schema'
import type { CampaignAssistanceMethod } from '@/shared/types/database.types'
import { ASSISTANCE_METHOD_TYPES } from '@/shared/constants'
import { ListSearchPager } from '@/shared/components/list-search-pager'
import { AssistanceMethodDetailModal } from './assistance-method-detail-modal'
import { CountryFlag } from '@/shared/components/country-flag'
import {
  COUNTRY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  typeLabel,
  countryLabel,
  contactHint,
  detailFieldCount,
} from '../utils/assistance-method-display'

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<CampaignAssistanceMethod | null>(null)

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
  const isVeTransfer = isVenezuela && type === 'bank_transfer'

  const emptyForm: Partial<CampaignAssistanceMethodValues> = {
    countryCode: 'VE',
    type: 'bank_transfer',
    isPrimary: false,
    isActive: true,
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    reset(emptyForm)
  }

  function startEdit(m: CampaignAssistanceMethod) {
    setSelectedMethod(null)
    setError(null)
    setEditingId(m.id)
    reset({
      countryCode: m.country_code,
      type: m.type,
      label: m.label,
      isPrimary: m.is_primary,
      isActive: m.is_active,
      holderFullName: m.holder_full_name,
      idNumber: m.id_number ?? '',
      phone: m.phone ?? '',
      bankName: m.bank_name ?? '',
      accountNumber: m.account_number ?? '',
      accountType: m.account_type ?? '',
      alias: m.alias ?? '',
      notes: m.notes ?? '',
      documentType: m.document_type ?? '',
      addressCountry: m.address_country ?? '',
      addressState: m.address_state ?? '',
      addressCity: m.address_city ?? '',
      addressLine: m.address_line ?? '',
      purpose: m.purpose ?? '',
    })
    setShowForm(true)
  }

  // Principal siempre primero (orden estable para el resto).
  function sortMethods(list: CampaignAssistanceMethod[]): CampaignAssistanceMethod[] {
    return [...list].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
  }

  function onSubmit(data: CampaignAssistanceMethodValues) {
    setError(null)
    startTransition(async () => {
      if (editingId) {
        const result = await updateAssistanceMethodAction(campaignId, editingId, data)
        if (!result.success) { setError(result.error); return }
        setMethods((prev) =>
          sortMethods(
            prev.map((m) => {
              if (m.id !== editingId) {
                // Si el editado pasa a principal, desmarca los demás.
                return data.isPrimary ? { ...m, is_primary: false } : m
              }
              return {
                ...m,
                country_code: data.countryCode,
                type: data.type,
                label: data.label,
                is_primary: data.isPrimary,
                is_active: data.isActive,
                holder_full_name: data.holderFullName,
                id_number: data.idNumber ?? null,
                phone: data.phone ?? null,
                bank_name: data.bankName ?? null,
                account_number: data.accountNumber ?? null,
                account_type: data.accountType ?? null,
                alias: data.alias ?? null,
                notes: data.notes ?? null,
                document_type: data.documentType ?? null,
                address_country: data.addressCountry ?? null,
                address_state: data.addressState ?? null,
                address_city: data.addressCity ?? null,
                address_line: data.addressLine ?? null,
                purpose: data.purpose ?? null,
              }
            }),
          ),
        )
        closeForm()
        return
      }
      const result = await createAssistanceMethodAction(campaignId, data)
      if (!result.success) { setError(result.error); return }
      setMethods((prev) => {
        const cleared = data.isPrimary ? prev.map((m) => ({ ...m, is_primary: false })) : prev
        return sortMethods([...cleared, result.data])
      })
      closeForm()
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
            onClick={() => {
              if (showForm && !editingId) { closeForm() }
              else { setEditingId(null); reset(emptyForm); setShowForm(true) }
            }}
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
          <p className="text-foreground text-sm font-semibold">
            {editingId ? 'Editar método de pago' : 'Nuevo método de pago'}
          </p>
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
                    <option key={t} value={t}>{typeLabel(t)}</option>
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
                {isVeTransfer && (
                  <div className="flex flex-col gap-1">
                    <label className="text-foreground text-xs font-medium">Tipo de cuenta *</label>
                    <select
                      {...register('accountType')}
                      className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                    >
                      <option value="">Selecciona…</option>
                      {ACCOUNT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {errors.accountType && (
                      <p className="text-destructive text-xs">{errors.accountType.message}</p>
                    )}
                  </div>
                )}
                {isVeTransfer ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-foreground text-xs font-medium">Tipo de documento *</label>
                      <select
                        {...register('documentType')}
                        className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                      >
                        <option value="">Selecciona…</option>
                        {DOCUMENT_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {errors.documentType && (
                        <p className="text-destructive text-xs">{errors.documentType.message}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-foreground text-xs font-medium">Número de documento *</label>
                      <input
                        {...register('idNumber')}
                        type="text"
                        placeholder="12345678"
                        className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
                      />
                      {errors.idNumber && (
                        <p className="text-destructive text-xs">{errors.idNumber.message}</p>
                      )}
                    </div>
                  </>
                ) : isVenezuela ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-foreground text-xs font-medium">Cédula / RIF</label>
                    <input
                      {...register('idNumber')}
                      type="text"
                      placeholder="Opcional"
                      className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          {isVeTransfer && (
            <div className="border-border bg-background/60 flex flex-col gap-3 rounded-lg border p-3">
              <p className="text-foreground text-xs font-semibold">
                Datos para transferencia internacional a Venezuela
              </p>
              <p className="text-muted-foreground text-xs">
                Obligatorios para transferencias desde el exterior (ej. Brubank).
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-foreground text-xs font-medium">País de dirección *</label>
                  <input
                    {...register('addressCountry')}
                    type="text"
                    placeholder="Venezuela"
                    className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                  />
                  {errors.addressCountry && (
                    <p className="text-destructive text-xs">{errors.addressCountry.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-foreground text-xs font-medium">Provincia / Estado *</label>
                  <input
                    {...register('addressState')}
                    type="text"
                    placeholder="Ej: Miranda"
                    className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                  />
                  {errors.addressState && (
                    <p className="text-destructive text-xs">{errors.addressState.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-foreground text-xs font-medium">Ciudad *</label>
                  <input
                    {...register('addressCity')}
                    type="text"
                    placeholder="Ej: Caracas"
                    className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                  />
                  {errors.addressCity && (
                    <p className="text-destructive text-xs">{errors.addressCity.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-foreground text-xs font-medium">Dirección *</label>
                  <input
                    {...register('addressLine')}
                    type="text"
                    placeholder="Calle, casa/apto, referencia"
                    className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                  />
                  {errors.addressLine && (
                    <p className="text-destructive text-xs">{errors.addressLine.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-foreground text-xs font-medium">Propósito de la transferencia *</label>
                  <input
                    {...register('purpose')}
                    type="text"
                    placeholder="Ej: Ayuda familiar / donación"
                    className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                  />
                  {errors.purpose && (
                    <p className="text-destructive text-xs">{errors.purpose.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input {...register('isPrimary')} type="checkbox" className="accent-primary" />
            <span className="text-foreground">Método principal</span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
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
              {editingId ? 'Guardar cambios' : 'Agregar método'}
            </button>
          </div>
        </form>
      )}

      <ListSearchPager
        items={methods}
        getKey={(m) => m.id}
        filterFn={(m, q) =>
          m.label.toLowerCase().includes(q) ||
          m.holder_full_name.toLowerCase().includes(q) ||
          (m.bank_name?.toLowerCase().includes(q) ?? false)
        }
        emptyMessage="No hay métodos de pago configurados."
        searchPlaceholder="Buscar método…"
        pageSize={3}
        searchThreshold={4}
        renderItem={(m) => {
          const contact = contactHint(m)
          const extras = detailFieldCount(m)
          return (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedMethod(m)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMethod(m) }
              }}
              className="bg-muted/40 hover:bg-muted focus-visible:ring-primary/50 flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors focus:outline-none focus-visible:ring-2"
            >
              {/* Country flag */}
              <CountryFlag
                code={m.country_code}
                title={countryLabel(m.country_code)}
                className="h-5 w-7 shrink-0 rounded-sm shadow-sm"
              />

              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-foreground truncate text-sm font-medium">{m.label}</span>
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
                {/* País · Banco · Tipo */}
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {[countryLabel(m.country_code), m.bank_name, typeLabel(m.type)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {/* Contacto */}
                {contact && (
                  <p className="text-foreground/80 mt-0.5 truncate font-mono text-xs">{contact}</p>
                )}
                {extras > 4 && (
                  <p className="text-primary mt-1 text-xs font-medium">Click para más detalles →</p>
                )}
              </div>

              {/* Right actions */}
              <div className="flex shrink-0 items-center gap-1">
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEdit(m) }}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-primary p-1 transition-colors disabled:opacity-50"
                      aria-label="Editar método"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(m.id) }}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors disabled:opacity-50"
                      aria-label="Eliminar método"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
                <ChevronRight className="text-muted-foreground size-4" />
              </div>
            </div>
          )
        }}
      />

      {selectedMethod && (
        <AssistanceMethodDetailModal
          method={selectedMethod}
          onClose={() => setSelectedMethod(null)}
        />
      )}
    </section>
  )
}
