'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, PackageOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import type { NeedCategory } from '@/shared/types/database.types'
import { createNeedAction, deleteNeedAction, updateNeedAction } from '../actions/needs.actions'
import { NeedFormModal } from './need-form-modal'
import { needsKeys, useCaseNeeds, useNeedCategories } from '../queries/needs.queries'
import type { NeedFormValues } from '../schemas/needs.schema'
import type { CaseNeedWithCategory } from '../types/needs.types'

interface NeedsManagerProps {
  caseId: string
  initialCategories: NeedCategory[]
  initialNeeds: CaseNeedWithCategory[]
  readOnly?: boolean
}

export function NeedsManager({
  caseId,
  initialCategories,
  initialNeeds,
  readOnly = false,
}: NeedsManagerProps) {
  const queryClient = useQueryClient()
  const needsQuery = useCaseNeeds(caseId, initialNeeds)
  const categoriesQuery = useNeedCategories(initialCategories)
  const [editingNeed, setEditingNeed] = useState<CaseNeedWithCategory | 'create' | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const needs = needsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  function updateNeedCache(savedNeed: CaseNeedWithCategory) {
    queryClient.setQueryData<CaseNeedWithCategory[]>(needsKeys.byCase(caseId), (current = []) => {
      const exists = current.some((need) => need.id === savedNeed.id)
      return exists
        ? current.map((need) => (need.id === savedNeed.id ? savedNeed : need))
        : [...current, savedNeed]
    })
    setEditingNeed(null)
  }

  function updateCategoryCache(category: NeedCategory) {
    queryClient.setQueryData<NeedCategory[]>(needsKeys.categories(), (current = []) => {
      const withoutCategory = current.filter((item) => item.id !== category.id)
      return [...withoutCategory, category].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    })
  }

  function deleteNeed(needId: string) {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteNeedAction(caseId, needId)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }
      queryClient.setQueryData<CaseNeedWithCategory[]>(needsKeys.byCase(caseId), (current = []) =>
        current.filter((need) => need.id !== needId),
      )
      setPendingDeleteId(null)
    })
  }

  function getAction(need?: CaseNeedWithCategory) {
    if (!need) {
      return (values: NeedFormValues) => createNeedAction(caseId, values)
    }
    return (values: NeedFormValues) => updateNeedAction(caseId, need.id, values)
  }

  return (
    <section className="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-foreground text-lg font-medium">Necesidades</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {needs.length === 0
              ? 'No hay necesidades registradas.'
              : `${needs.length} ${needs.length === 1 ? 'necesidad activa' : 'necesidades activas'}.`}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setEditingNeed('create')}
            className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="size-4" />
            Agregar necesidad
          </button>
        )}
      </div>

      {deleteError && (
        <p className="bg-destructive/10 text-destructive mb-4 rounded-xl p-3 text-sm">
          {deleteError}
        </p>
      )}

      {needsQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-10">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Cargando necesidades…</span>
        </div>
      ) : needs.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center">
          <div className="bg-accent flex size-12 items-center justify-center rounded-full">
            <PackageOpen className="text-foreground size-6" />
          </div>
          <div>
            <p className="font-display text-foreground font-medium">Sin necesidades</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Agrega la primera necesidad verificada de este caso.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {needs.map((need) => (
            <li key={need.id} className="bg-muted flex flex-col gap-3 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-foreground font-semibold">{need.category.name}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                    Cantidad: {need.quantity}
                    {need.unit ? ` ${need.unit}` : ''}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingNeed(need)}
                      className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full p-2 transition-colors"
                      aria-label={`Editar ${need.category.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(need.id)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full p-2 transition-colors"
                      aria-label={`Eliminar ${need.category.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              {need.comments && (
                <p className="text-foreground/80 text-sm leading-relaxed">{need.comments}</p>
              )}

              {pendingDeleteId === need.id && (
                <div className="border-destructive/20 bg-background flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                  <p className="text-foreground text-xs">¿Eliminar esta necesidad?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="text-muted-foreground text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNeed(need.id)}
                      disabled={isDeleting}
                      className="text-destructive text-xs font-semibold disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editingNeed && (
        <NeedFormModal
          need={editingNeed === 'create' ? undefined : editingNeed}
          categories={categories}
          action={getAction(editingNeed === 'create' ? undefined : editingNeed)}
          onCategoryCreated={updateCategoryCache}
          onClose={() => setEditingNeed(null)}
          onSaved={updateNeedCache}
        />
      )}
    </section>
  )
}
