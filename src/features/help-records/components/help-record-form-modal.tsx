'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2, Plus, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { ActionResult } from '@/shared/types/action-result'
import type { HelpType } from '@/shared/types/database.types'
import type { CaseNeedWithCategory } from '@/features/needs/types/needs.types'
import { createHelpTypeAction } from '../actions/help-records.actions'
import { helpRecordFormSchema, type HelpRecordFormValues } from '../schemas/help-records.schema'
import type { HelpRecordWithType } from '../types/help-records.types'

interface HelpRecordFormModalProps {
  action: (values: HelpRecordFormValues) => Promise<ActionResult<HelpRecordWithType>>
  helpTypes: HelpType[]
  initialNeedIds?: string[]
  needs: CaseNeedWithCategory[]
  onClose: () => void
  onHelpTypeCreated: (helpType: HelpType) => void
  onSaved: (record: HelpRecordWithType) => void
}

function today(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function HelpRecordFormModal({
  action,
  helpTypes,
  initialNeedIds = [],
  needs,
  onClose,
  onHelpTypeCreated,
  onSaved,
}: HelpRecordFormModalProps) {
  const [isPending, startTransition] = useTransition()
  const [helpTypeSearch, setHelpTypeSearch] = useState('')
  const [isCreatingType, setIsCreatingType] = useState(false)
  const [helpTypeError, setHelpTypeError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<HelpRecordFormValues>({
    resolver: zodResolver(helpRecordFormSchema),
    mode: 'onChange',
    defaultValues: {
      helpTypeId: '',
      caseNeedIds: initialNeedIds,
      title: '',
      description: '',
      amountUsd: undefined,
      helpedAt: today(),
      privateNotes: '',
    },
  })

  const selectedHelpTypeId = watch('helpTypeId')
  const normalizedSearch = helpTypeSearch.trim().toLocaleLowerCase('es')
  const filteredTypes = helpTypes.filter((helpType) =>
    helpType.name.toLocaleLowerCase('es').includes(normalizedSearch),
  )
  const exactType = helpTypes.find(
    (helpType) => helpType.name.toLocaleLowerCase('es') === normalizedSearch,
  )

  function selectHelpType(helpType: HelpType) {
    setValue('helpTypeId', helpType.id, { shouldDirty: true, shouldValidate: true })
    setHelpTypeSearch(helpType.name)
    setHelpTypeError(null)
  }

  async function createHelpType() {
    setHelpTypeError(null)
    setIsCreatingType(true)
    const result = await createHelpTypeAction({ name: helpTypeSearch })
    setIsCreatingType(false)

    if (!result.success) {
      setHelpTypeError(result.error)
      return
    }

    onHelpTypeCreated(result.data)
    selectHelpType(result.data)
  }

  function onSubmit(values: HelpRecordFormValues) {
    startTransition(async () => {
      const result = await action(values)
      if (!result.success) {
        setError('root', { message: result.error })
        return
      }
      onSaved(result.data)
    })
  }

  return (
    <div
      className="bg-foreground/30 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="bg-background border-border max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border shadow-xl">
        <div className="border-border flex items-center justify-between border-b p-6">
          <div>
            <h2 className="font-display text-foreground text-xl font-medium">Registrar ayuda</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Este registro será anónimo en la ficha pública.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted rounded-full p-2 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-6">
          {errors.root && (
            <p className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
              {errors.root.message}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-semibold">
              Tipo de ayuda <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={helpTypeSearch}
                onChange={(event) => {
                  setHelpTypeSearch(event.target.value)
                  setValue('helpTypeId', '', { shouldValidate: true })
                }}
                placeholder="Medicina, alimentos, transporte…"
                className="border-input bg-input-background focus:ring-primary/30 w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
            {helpTypeSearch.trim() && (
              <div className="border-border bg-card max-h-40 overflow-y-auto rounded-xl border p-1">
                {filteredTypes.map((helpType) => (
                  <button
                    key={helpType.id}
                    type="button"
                    onClick={() => selectHelpType(helpType)}
                    className="hover:bg-muted text-foreground flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors"
                  >
                    {helpType.name}
                    {selectedHelpTypeId === helpType.id && (
                      <Check className="text-primary size-4" />
                    )}
                  </button>
                ))}
                {!exactType && helpTypeSearch.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => void createHelpType()}
                    disabled={isCreatingType}
                    className="text-primary hover:bg-primary/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors"
                  >
                    {isCreatingType ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Crear “{helpTypeSearch.trim()}”
                  </button>
                )}
              </div>
            )}
            {helpTypeError && <p className="text-destructive text-xs">{helpTypeError}</p>}
            {errors.helpTypeId && (
              <p className="text-destructive text-xs">{errors.helpTypeId.message}</p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-foreground mb-2 text-sm font-semibold">
              Necesidades asociadas <span className="text-destructive">*</span>
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {needs.map((need) => (
                <label
                  key={need.id}
                  className="border-border bg-card hover:bg-muted flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors"
                >
                  <input
                    {...register('caseNeedIds')}
                    type="checkbox"
                    value={need.id}
                    className="accent-primary mt-0.5 size-4"
                  />
                  <span>
                    <span className="text-foreground block text-sm font-semibold">
                      {need.category.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {need.quantity}
                      {need.unit ? ` ${need.unit}` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {errors.caseNeedIds && (
              <p className="text-destructive text-xs">{errors.caseNeedIds.message}</p>
            )}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-semibold">
              Título <span className="text-destructive">*</span>
            </label>
            <input
              {...register('title')}
              type="text"
              placeholder="Ej: Entrega de medicamentos"
              className="border-input bg-input-background focus:ring-primary/30 rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-semibold">Monto USD</label>
              <input
                {...register('amountUsd', {
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
                type="number"
                min="0"
                step="0.01"
                placeholder="Opcional"
                className="border-input bg-input-background focus:ring-primary/30 rounded-xl border px-4 py-2.5 font-mono text-sm focus:ring-2 focus:outline-none"
              />
              {errors.amountUsd && (
                <p className="text-destructive text-xs">{errors.amountUsd.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-semibold">
                Fecha de ayuda <span className="text-destructive">*</span>
              </label>
              <input
                {...register('helpedAt')}
                type="date"
                className="border-input bg-input-background focus:ring-primary/30 rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
              />
              {errors.helpedAt && (
                <p className="text-destructive text-xs">{errors.helpedAt.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-semibold">Descripción pública</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe brevemente la ayuda entregada…"
              className="border-input bg-input-background focus:ring-primary/30 resize-none rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-semibold">Notas privadas</label>
            <textarea
              {...register('privateNotes')}
              rows={2}
              placeholder="Información visible solo para el equipo…"
              className="border-input bg-input-background focus:ring-primary/30 resize-none rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !isValid || needs.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/85 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Registrar ayuda
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
