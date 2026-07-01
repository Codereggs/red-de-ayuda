'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2, UserPlus, X, Check, Search, Upload, Pencil, ChevronRight, AlertTriangle } from 'lucide-react'
import {
  addCampaignMemberAction,
  updateCampaignMemberAction,
  getCampaignMemberDetailAction,
  removeCampaignMemberAction,
  deleteAllCampaignMembersAction,
  toggleNeedPurchasedAction,
  bulkAddCampaignMembersAction,
} from '../actions/campaigns.actions'
import { campaignMemberSchema, bulkMemberJsonSchema, type CampaignMemberValues, type BulkMemberJson } from '../schemas/campaigns.schema'
import type { PublicCampaignMember } from '../types/campaigns.types'
import type { NeedCategory } from '@/shared/types/database.types'
import { createNeedCategoryAction } from '@/features/needs/actions/needs.actions'
import { ListSearchPager } from '@/shared/components/list-search-pager'
import { MemberDetailModal } from './member-detail-modal'

interface CampaignMembersManagerProps {
  campaignId: string
  initialMembers: PublicCampaignMember[]
  needCategories: NeedCategory[]
  readOnly?: boolean
  /** Admin-only: enables the "delete all members" purge. */
  canPurge?: boolean
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
  canPurge = false,
}: CampaignMembersManagerProps) {
  const [members, setMembers] = useState(initialMembers)
  const [categories, setCategories] = useState<NeedCategory[]>(needCategories)
  const [showForm, setShowForm] = useState(false)
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<PublicCampaignMember | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Purga total (admin)
  const [showPurgeModal, setShowPurgeModal] = useState(false)
  const [purgeText, setPurgeText] = useState('')
  const [isPurging, setIsPurging] = useState(false)
  const [purgeError, setPurgeError] = useState<string | null>(null)

  function handlePurge() {
    if (purgeText !== 'CONFIRMAR') return
    setIsPurging(true)
    setPurgeError(null)
    void (async () => {
      const result = await deleteAllCampaignMembersAction(campaignId, purgeText)
      setIsPurging(false)
      if (!result.success) { setPurgeError(result.error); return }
      setMembers([])
      setShowPurgeModal(false)
      setPurgeText('')
    })()
  }

  // Bulk import state
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkPreview, setBulkPreview] = useState<BulkMemberJson | null>(null)
  const [bulkParseError, setBulkParseError] = useState<string | null>(null)
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ added: number; newCategories: number } | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const jsonFileRef = useRef<HTMLInputElement>(null)

  function handleJsonFile(file: File) {
    setBulkParseError(null)
    setBulkPreview(null)
    setBulkResult(null)
    setBulkError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        const parsed = bulkMemberJsonSchema.safeParse(raw)
        if (!parsed.success) {
          setBulkParseError(`JSON inválido: ${parsed.error.issues[0]?.message ?? 'formato incorrecto'}`)
          return
        }
        setBulkPreview(parsed.data)
      } catch {
        setBulkParseError('No se pudo leer el archivo JSON.')
      }
    }
    reader.readAsText(file)
  }

  function handleBulkConfirm() {
    if (!bulkPreview) return
    setIsBulkImporting(true)
    setBulkError(null)
    void (async () => {
      const result = await bulkAddCampaignMembersAction(campaignId, bulkPreview)
      setIsBulkImporting(false)
      if (!result.success) { setBulkError(result.error); return }
      setBulkResult(result.data)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    })()
  }

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

  function closeForm() {
    setShowForm(false)
    setEditingCaseId(null)
    reset({ fullName: '', idNumber: '', privateNotes: '', needs: [{ needCategoryId: '', priceUsd: 0 }] })
  }

  function startEdit(member: PublicCampaignMember) {
    setSelectedMember(null)
    setError(null)
    setEditingCaseId(member.caseId)
    // Prefill with what we already have; load private data (cédula/notas) lazily.
    reset({
      fullName: member.fullName,
      idNumber: '',
      privateNotes: '',
      needs:
        member.needs.length > 0
          ? member.needs.map((n) => ({ needCategoryId: n.needCategoryId, priceUsd: n.price_usd }))
          : [{ needCategoryId: '', priceUsd: 0 }],
    })
    setShowForm(true)
    void (async () => {
      const detail = await getCampaignMemberDetailAction(campaignId, member.caseId)
      if (detail.success) {
        reset({
          fullName: member.fullName,
          idNumber: detail.data.idNumber ?? '',
          privateNotes: detail.data.privateNotes ?? '',
          needs:
            member.needs.length > 0
              ? member.needs.map((n) => ({ needCategoryId: n.needCategoryId, priceUsd: n.price_usd }))
              : [{ needCategoryId: '', priceUsd: 0 }],
        })
      }
    })()
  }

  function onSubmit(data: CampaignMemberValues) {
    setError(null)
    startTransition(async () => {
      if (editingCaseId) {
        const result = await updateCampaignMemberAction(campaignId, editingCaseId, data)
        if (!result.success) { setError(result.error); return }
        setMembers((prev) =>
          prev.map((m) => {
            if (m.caseId !== editingCaseId) return m
            // Rebuild needs preserving purchased_at by matching category (mirrors server).
            const pool = [...m.needs]
            const rebuilt = data.needs.map((n) => {
              const idx = pool.findIndex((e) => e.needCategoryId === n.needCategoryId)
              const prev = idx >= 0 ? pool.splice(idx, 1)[0] : null
              const cat = categories.find((c) => c.id === n.needCategoryId)
              return {
                id: prev?.id ?? crypto.randomUUID(),
                needCategoryId: n.needCategoryId,
                needCategoryName: cat?.name ?? prev?.needCategoryName ?? '',
                price_usd: n.priceUsd,
                purchased_at: prev?.purchased_at ?? null,
              }
            })
            return { ...m, fullName: data.fullName, needs: rebuilt }
          }),
        )
        closeForm()
        return
      }
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
      closeForm()
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowBulkModal(true); setBulkPreview(null); setBulkParseError(null); setBulkResult(null); setBulkError(null) }}
              className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
            >
              <Upload className="size-3.5" />
              Importar JSON
            </button>
            <input
              ref={jsonFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJsonFile(f) }}
            />
            <button
              type="button"
              onClick={() => {
                if (showForm && !editingCaseId) { closeForm() }
                else {
                  setEditingCaseId(null)
                  reset({ fullName: '', idNumber: '', privateNotes: '', needs: [{ needCategoryId: '', priceUsd: 0 }] })
                  setShowForm(true)
                }
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
            >
              <UserPlus className="size-3.5" />
              Agregar
            </button>
            {canPurge && members.length > 0 && (
              <button
                type="button"
                onClick={() => { setShowPurgeModal(true); setPurgeText(''); setPurgeError(null) }}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
              >
                <Trash2 className="size-3.5" />
                Borrar todos
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-xl p-3 text-sm">{error}</div>
      )}

      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border-border flex w-full max-w-md flex-col gap-4 rounded-2xl border p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-xl">
                <AlertTriangle className="text-destructive size-5" />
              </div>
              <div>
                <h3 className="text-foreground font-display font-semibold">Borrar todos los miembros</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Se eliminarán <strong>{members.length}</strong> miembro(s) con sus necesidades y datos
                  de forma <strong>permanente</strong>. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-foreground text-sm">
                Escribe <span className="text-destructive font-mono font-semibold">CONFIRMAR</span> para
                proceder:
              </label>
              <input
                type="text"
                value={purgeText}
                onChange={(e) => setPurgeText(e.target.value)}
                placeholder="CONFIRMAR"
                autoFocus
                className="border-input bg-background focus-visible:ring-destructive/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
              />
            </div>

            {purgeError && <p className="text-destructive text-sm">{purgeError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowPurgeModal(false); setPurgeText('') }}
                disabled={isPurging}
                className="border-border text-foreground hover:bg-muted rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePurge}
                disabled={isPurging || purgeText !== 'CONFIRMAR'}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPurging && <Loader2 className="size-3.5 animate-spin" />}
                Borrar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && !readOnly && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="border-border bg-muted/30 mb-4 flex flex-col gap-4 rounded-xl border p-4"
        >
          <p className="text-foreground text-sm font-semibold">
            {editingCaseId ? 'Editar miembro' : 'Nuevo miembro'}
          </p>
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

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">Notas privadas (opcional)</label>
            <textarea
              {...register('privateNotes')}
              rows={2}
              placeholder="Información interna del miembro"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
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
              {editingCaseId ? 'Guardar cambios' : 'Agregar miembro'}
            </button>
          </div>
        </form>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border-border flex w-full max-w-lg flex-col gap-4 rounded-2xl border p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-display font-semibold">Importar miembros desde JSON</h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {!bulkPreview && !bulkResult && (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">
                  El JSON debe ser un array con objetos que tengan{' '}
                  <code className="bg-muted rounded px-1 text-xs">name</code>,{' '}
                  <code className="bg-muted rounded px-1 text-xs">document</code> (opcional) y{' '}
                  <code className="bg-muted rounded px-1 text-xs">needs</code> con{' '}
                  <code className="bg-muted rounded px-1 text-xs">medicine</code>,{' '}
                  <code className="bg-muted rounded px-1 text-xs">dose</code> y{' '}
                  <code className="bg-muted rounded px-1 text-xs">price</code>.
                </p>
                <button
                  type="button"
                  onClick={() => jsonFileRef.current?.click()}
                  className="border-border hover:bg-muted flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition-colors"
                >
                  <Upload className="text-muted-foreground size-6" />
                  <span className="text-foreground font-medium">Seleccionar archivo .json</span>
                </button>
                {bulkParseError && (
                  <p className="text-destructive rounded-lg text-sm">{bulkParseError}</p>
                )}
              </div>
            )}

            {bulkPreview && !bulkResult && (
              <div className="flex flex-col gap-3">
                <div className="bg-muted/40 rounded-xl p-3 text-sm">
                  <p className="text-foreground font-medium">Vista previa</p>
                  <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                    <li>{bulkPreview.length} miembro(s)</li>
                    <li>
                      {bulkPreview.reduce((s, m) => s + m.needs.length, 0)} necesidad(es) en total
                    </li>
                  </ul>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-border border-b text-left">
                        <th className="pb-1 font-medium">Nombre</th>
                        <th className="pb-1 font-medium">Necesidades</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {bulkPreview.map((m, i) => (
                        <tr key={i}>
                          <td className="text-foreground py-1.5 pr-2 font-medium">{m.name}</td>
                          <td className="text-muted-foreground py-1.5">
                            {m.needs.map((n, j) => (
                              <span key={j} className="block">
                                {n.dose ? `${n.medicine} ${n.dose}` : n.medicine}
                                {n.price != null && n.price > 0 && (
                                  <span className="font-mono"> — ${n.price}</span>
                                )}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkError && (
                  <p className="text-destructive text-sm">{bulkError}</p>
                )}
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => { setBulkPreview(null); if (jsonFileRef.current) jsonFileRef.current.value = '' }}
                    className="border-border text-foreground hover:bg-muted rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    Cambiar archivo
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkConfirm}
                    disabled={isBulkImporting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {isBulkImporting && <Loader2 className="size-3.5 animate-spin" />}
                    Confirmar importación
                  </button>
                </div>
              </div>
            )}

            {bulkResult && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                  <Check className="text-primary size-6" />
                </div>
                <p className="text-foreground font-medium">
                  {bulkResult.added} miembro(s) importado(s) correctamente
                </p>
                {bulkResult.newCategories > 0 && (
                  <p className="text-muted-foreground text-sm">
                    Se crearon {bulkResult.newCategories} categoría(s) de necesidad nueva(s).
                  </p>
                )}
                <p className="text-muted-foreground text-xs">Recargando…</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ListSearchPager
        items={members}
        getKey={(member) => member.caseId}
        filterFn={(member, q) => member.fullName.toLowerCase().includes(q)}
        emptyMessage="No hay miembros en esta campaña aún."
        searchPlaceholder="Buscar miembro…"
        pageSize={3}
        searchThreshold={4}
        listClassName="flex flex-col gap-3"
        renderItem={(member) => {
          const memberTotal = member.needs.reduce((s, n) => s + n.price_usd, 0)
          const purchasedCount = member.needs.filter((n) => n.purchased_at).length
          return (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedMember(member)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMember(member) }
              }}
              className="bg-muted/40 hover:bg-muted focus-visible:ring-primary/50 cursor-pointer rounded-xl p-3 transition-colors focus:outline-none focus-visible:ring-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">{member.fullName}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {member.needs.length} necesidad(es)
                    {member.needs.length > 0 && ` · ${purchasedCount}/${member.needs.length} comprado`}
                    {memberTotal > 0 && (
                      <span className="font-mono">
                        {' · '}${memberTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startEdit(member) }}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-primary p-1 transition-colors disabled:opacity-50"
                        aria-label="Editar miembro"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemove(member.caseId) }}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors disabled:opacity-50"
                        aria-label="Eliminar miembro"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                  <ChevronRight className="text-muted-foreground size-4" />
                </div>
              </div>
              {member.needs.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {member.needs.slice(0, 3).map((need) => {
                    const purchased = !!need.purchased_at
                    return (
                      <li key={need.id} className="flex items-center gap-2">
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleTogglePurchased(member.caseId, need.id, purchased) }}
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
                  {member.needs.length > 3 && (
                    <li className="text-primary text-xs font-medium">
                      +{member.needs.length - 3} más · click para ver todo
                    </li>
                  )}
                </ul>
              )}
            </div>
          )
        }}
      />

      {selectedMember && (
        <MemberDetailModal
          campaignId={campaignId}
          member={members.find((m) => m.caseId === selectedMember.caseId) ?? selectedMember}
          readOnly={readOnly}
          onClose={() => setSelectedMember(null)}
          onEdit={() => startEdit(selectedMember)}
          onTogglePurchased={
            readOnly
              ? undefined
              : (needId, currentlyPurchased) =>
                  handleTogglePurchased(selectedMember.caseId, needId, currentlyPurchased)
          }
        />
      )}
    </section>
  )
}
