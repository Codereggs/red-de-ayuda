'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2, UserPlus, X, Check, Search } from 'lucide-react'
import {
  addCampaignMemberAction,
  removeCampaignMemberAction,
  toggleNeedPurchasedAction,
} from '../actions/campaigns.actions'
import { campaignMemberSchema, type CampaignMemberValues } from '../schemas/campaigns.schema'
import type { PublicCampaignMember } from '../types/campaigns.types'
import type { NeedCategory } from '@/shared/types/database.types'
import { createNeedCategoryAction } from '@/features/needs/actions/needs.actions'

interface CampaignMembersManagerProps {
  campaignId: string
  initialMembers: PublicCampaignMember[]
  needCategories: NeedCategory[]
  readOnly?: boolean
}

function NeedCategoryCombobox({
  value,
  onChange,
  categories,
  onCategoryCreated,
  error,
}: {
  value: string
  onChange: (id: string) => void
  categories: NeedCategory[]
  onCategoryCreated: (cat: NeedCategory) => void
  error?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const selected = categories.find((c) => c.id === value)
  const filtered = query
    ? categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : categories
  const exactMatch = categories.find((c) => c.name.toLowerCase() === query.trim().toLowerCase())

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleCreate() {
    const name = query.trim()
    if (!name) return
    setCreateError(null)
    setIsCreating(true)
    const result = await createNeedCategoryAction({ name })
    setIsCreating(false)
    if (!result.success) { setCreateError(result.error); return }
    onCategoryCreated(result.data)
    onChange(result.data.id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative flex-1">
      <div
        className={`border-input bg-background flex items-center rounded-lg border ${open ? 'ring-primary/50 ring-2' : ''}`}
      >
        {selected ? (
          <span className="flex-1 px-3 py-2 text-sm">{selected.name}</span>
        ) : (
          <span className="flex-1 px-3 py-2 text-sm text-gray-400">Buscar necesidad…</span>
        )}
        <div className="flex items-center gap-1 pr-2">
          {selected && (
            <button
              type="button"
              onClick={() => { onChange(''); setQuery('') }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="size-3.5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-background border-border absolute z-20 mt-1 w-full rounded-lg border shadow-lg">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribir para filtrar…"
            className="border-border w-full border-b px-3 py-2 text-sm focus:outline-none"
          />
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => { onChange(cat.id); setQuery(''); setOpen(false) }}
                  className={`hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    cat.id === value ? 'text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  {cat.id === value && <Check className="size-3.5 shrink-0" />}
                  {cat.name}
                </button>
              </li>
            ))}
            {query.trim().length >= 2 && !exactMatch && (
              <li>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={isCreating}
                  className="text-primary hover:bg-primary/10 flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="size-3.5 animate-spin shrink-0" />
                  ) : (
                    <Plus className="size-3.5 shrink-0" />
                  )}
                  Crear &quot;{query.trim()}&quot;
                </button>
              </li>
            )}
            {filtered.length === 0 && query.trim().length < 2 && (
              <li className="text-muted-foreground px-3 py-2 text-sm">Escribe para filtrar…</li>
            )}
          </ul>
          {createError && <p className="text-destructive border-t px-3 py-2 text-xs">{createError}</p>}
        </div>
      )}
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  )
}

export function CampaignMembersManager({
  campaignId,
  initialMembers,
  needCategories,
  readOnly = false,
}: CampaignMembersManagerProps) {
  const [members, setMembers] = useState(initialMembers)
  const [categories, setCategories] = useState<NeedCategory[]>(needCategories)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCategoryCreated(cat: NeedCategory) {
    setCategories((prev) => [...prev, cat])
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CampaignMemberValues>({
    resolver: zodResolver(campaignMemberSchema),
    mode: 'onChange',
    defaultValues: { needs: [{ needCategoryId: '', priceUsd: 0 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'needs' })

  function onSubmit(data: CampaignMemberValues) {
    setError(null)
    startTransition(async () => {
      const result = await addCampaignMemberAction(campaignId, data)
      if (!result.success) { setError(result.error); return }
      const newMember: PublicCampaignMember = {
        caseId: result.data.caseId,
        fullName: data.fullName,
        needs: data.needs.map((n) => {
          const cat = categories.find((c) => c.id === n.needCategoryId)
          return {
            id: crypto.randomUUID(),
            needCategoryId: n.needCategoryId,
            needCategoryName: cat?.name ?? '',
            price_usd: n.priceUsd,
            purchased_at: null,
          }
        }),
      }
      setMembers((prev) => [...prev, newMember])
      reset({ needs: [{ needCategoryId: '', priceUsd: 0 }] })
      setShowForm(false)
    })
  }

  function handleRemove(caseId: string) {
    startTransition(async () => {
      const result = await removeCampaignMemberAction(campaignId, caseId)
      if (!result.success) { setError(result.error); return }
      setMembers((prev) => prev.filter((m) => m.caseId !== caseId))
    })
  }

  function handleTogglePurchased(caseId: string, needId: string, currentlyPurchased: boolean) {
    startTransition(async () => {
      const result = await toggleNeedPurchasedAction(needId, campaignId, !currentlyPurchased)
      if (!result.success) { setError(result.error); return }
      setMembers((prev) =>
        prev.map((m) =>
          m.caseId !== caseId
            ? m
            : {
                ...m,
                needs: m.needs.map((n) =>
                  n.id !== needId ? n : { ...n, purchased_at: result.data.purchased_at },
                ),
              },
        ),
      )
    })
  }

  const totalCost = members.reduce((sum, m) => sum + m.needs.reduce((s, n) => s + n.price_usd, 0), 0)
  const purchasedCost = members.reduce(
    (sum, m) => sum + m.needs.filter((n) => n.purchased_at).reduce((s, n) => s + n.price_usd, 0),
    0,
  )

  return (
    <section className="bg-card border-border rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-foreground text-base font-medium">
            Miembros ({members.length})
          </h2>
          {totalCost > 0 && (
            <p className="text-muted-foreground mt-0.5 font-mono text-xs">
              ${purchasedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} /{' '}
              ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} comprado
            </p>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            <UserPlus className="size-3.5" />
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
          className="border-border bg-muted/30 mb-4 flex flex-col gap-4 rounded-xl border p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Nombre completo <span className="text-destructive">*</span>
            </label>
            <input
              {...register('fullName')}
              type="text"
              placeholder="Nombre y apellido"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.fullName && <p className="text-destructive text-xs">{errors.fullName.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">Cédula (opcional)</label>
            <input
              {...register('idNumber')}
              type="text"
              placeholder="V-12345678"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-foreground text-sm font-medium">
                Necesidades <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => append({ needCategoryId: '', priceUsd: 0 })}
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                <Plus className="size-3" />
                Agregar
              </button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <Controller
                  control={control}
                  name={`needs.${index}.needCategoryId`}
                  render={({ field: f, fieldState }) => (
                    <NeedCategoryCombobox
                      value={f.value}
                      onChange={f.onChange}
                      categories={categories}
                      onCategoryCreated={handleCategoryCreated}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <div className="border-input bg-background focus-within:ring-primary/50 flex shrink-0 items-center overflow-hidden rounded-lg border focus-within:ring-2">
                  <span className="text-muted-foreground border-input border-r px-2 py-2 text-sm">$</span>
                  <input
                    {...register(`needs.${index}.priceUsd`, { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-24 bg-transparent px-2 py-2 text-sm focus:outline-none"
                  />
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-muted-foreground hover:text-destructive mt-2 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {errors.needs && !Array.isArray(errors.needs) && (
              <p className="text-destructive text-xs">{errors.needs.message}</p>
            )}
          </div>

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
              Agregar miembro
            </button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay miembros en esta campaña aún.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li key={member.caseId} className="bg-muted/40 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-foreground text-sm font-medium">{member.fullName}</p>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member.caseId)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive shrink-0 transition-colors disabled:opacity-50"
                    aria-label="Eliminar miembro"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {member.needs.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {member.needs.map((need) => {
                    const purchased = !!need.purchased_at
                    return (
                      <li key={need.id} className="flex items-center gap-2">
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePurchased(member.caseId, need.id, purchased)}
                            disabled={isPending}
                            className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
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
                          className={`text-xs ${purchased ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                        >
                          {need.needCategoryName}
                        </span>
                        {need.price_usd > 0 && (
                          <span className="text-muted-foreground font-mono text-xs">
                            ${need.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
