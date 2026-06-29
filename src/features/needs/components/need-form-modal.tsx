'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2, Plus, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { ActionResult } from '@/shared/types/action-result'
import type { NeedCategory } from '@/shared/types/database.types'
import { createNeedCategoryAction } from '../actions/needs.actions'
import { needFormSchema, type NeedFormValues } from '../schemas/needs.schema'
import type { CaseNeedWithCategory } from '../types/needs.types'

interface NeedFormModalProps {
  need?: CaseNeedWithCategory
  categories: NeedCategory[]
  action: (values: NeedFormValues) => Promise<ActionResult<CaseNeedWithCategory>>
  onCategoryCreated: (category: NeedCategory) => void
  onClose: () => void
  onSaved: (need: CaseNeedWithCategory) => void
}

export function NeedFormModal({
  need,
  categories,
  action,
  onCategoryCreated,
  onClose,
  onSaved,
}: NeedFormModalProps) {
  const [isPending, startTransition] = useTransition()
  const [categorySearch, setCategorySearch] = useState(need?.category.name ?? '')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<NeedFormValues>({
    resolver: zodResolver(needFormSchema),
    mode: 'onChange',
    defaultValues: {
      needCategoryId: need?.need_category_id ?? '',
      quantity: need?.quantity ?? 1,
      unit: need?.unit ?? '',
      comments: need?.comments ?? '',
    },
  })

  const selectedCategoryId = watch('needCategoryId')
  const normalizedSearch = categorySearch.trim().toLocaleLowerCase('es')
  const filteredCategories = categories.filter((category) =>
    category.name.toLocaleLowerCase('es').includes(normalizedSearch),
  )
  const exactCategory = categories.find(
    (category) => category.name.toLocaleLowerCase('es') === normalizedSearch,
  )

  function selectCategory(category: NeedCategory) {
    setValue('needCategoryId', category.id, { shouldValidate: true, shouldDirty: true })
    setCategorySearch(category.name)
    setCategoryError(null)
  }

  async function createCategory() {
    setCategoryError(null)
    setIsCreatingCategory(true)
    const result = await createNeedCategoryAction({ name: categorySearch })
    setIsCreatingCategory(false)

    if (!result.success) {
      setCategoryError(result.error)
      return
    }

    onCategoryCreated(result.data)
    selectCategory(result.data)
  }

  function onSubmit(values: NeedFormValues) {
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
      <div className="bg-background border-border max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border shadow-xl">
        <div className="border-border flex items-center justify-between border-b p-6">
          <div>
            <h2 className="font-display text-foreground text-xl font-medium">
              {need ? 'Editar necesidad' : 'Agregar necesidad'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Registra qué se necesita y en qué cantidad.
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
              Categoría <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={categorySearch}
                onChange={(event) => {
                  setCategorySearch(event.target.value)
                  setValue('needCategoryId', '', { shouldValidate: true })
                }}
                placeholder="Buscar medicamento, alimento…"
                className="border-input bg-input-background focus:ring-primary/30 w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
              />
            </div>

            {categorySearch.trim() && (
              <div className="border-border bg-card max-h-40 overflow-y-auto rounded-xl border p-1">
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => selectCategory(category)}
                    className="hover:bg-muted text-foreground flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors"
                  >
                    {category.name}
                    {selectedCategoryId === category.id && (
                      <Check className="text-primary size-4" />
                    )}
                  </button>
                ))}
                {!exactCategory && categorySearch.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => void createCategory()}
                    disabled={isCreatingCategory}
                    className="text-primary hover:bg-primary/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors"
                  >
                    {isCreatingCategory ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Crear “{categorySearch.trim()}”
                  </button>
                )}
                {filteredCategories.length === 0 && categorySearch.trim().length < 2 && (
                  <p className="text-muted-foreground px-3 py-2 text-xs">
                    Escribe al menos 2 caracteres.
                  </p>
                )}
              </div>
            )}
            {categoryError && <p className="text-destructive text-xs">{categoryError}</p>}
            {errors.needCategoryId && (
              <p className="text-destructive text-xs">{errors.needCategoryId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-semibold">
                Cantidad <span className="text-destructive">*</span>
              </label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                min="0.01"
                step="0.01"
                className="border-input bg-input-background focus:ring-primary/30 rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
              />
              {errors.quantity && (
                <p className="text-destructive text-xs">{errors.quantity.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-semibold">Unidad</label>
              <input
                {...register('unit')}
                type="text"
                placeholder="cajas, kg, unidades…"
                className="border-input bg-input-background focus:ring-primary/30 rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-semibold">Comentarios</label>
            <textarea
              {...register('comments')}
              rows={3}
              placeholder="Presentación, detalles o indicaciones…"
              className="border-input bg-input-background focus:ring-primary/30 resize-none rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
            />
            {errors.comments && (
              <p className="text-destructive text-xs">{errors.comments.message}</p>
            )}
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
              disabled={isPending || !isValid}
              className="bg-primary text-primary-foreground hover:bg-primary/85 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {need ? 'Guardar cambios' : 'Agregar necesidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
