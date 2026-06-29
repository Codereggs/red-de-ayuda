'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, HandHeart, Loader2, Plus, Trash2 } from 'lucide-react'
import type { HelpType } from '@/shared/types/database.types'
import type { CaseNeedWithCategory } from '@/features/needs/types/needs.types'
import { createHelpRecordAction, deleteHelpRecordAction } from '../actions/help-records.actions'
import { HelpRecordFormModal } from './help-record-form-modal'
import {
  helpRecordsKeys,
  useHelpTypes,
  usePrivateHelpRecords,
} from '../queries/help-records.queries'
import type { HelpRecordFormValues } from '../schemas/help-records.schema'
import type { HelpRecordWithType } from '../types/help-records.types'

interface HelpRecordsManagerProps {
  caseId: string
  initialHelpTypes: HelpType[]
  initialRecords: HelpRecordWithType[]
  needs: CaseNeedWithCategory[]
  readOnly?: boolean
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function HelpRecordsManager({
  caseId,
  initialHelpTypes,
  initialRecords,
  needs,
  readOnly = false,
}: HelpRecordsManagerProps) {
  const queryClient = useQueryClient()
  const recordsQuery = usePrivateHelpRecords(caseId, initialRecords)
  const helpTypesQuery = useHelpTypes(initialHelpTypes)
  const [formNeedIds, setFormNeedIds] = useState<string[] | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const records = recordsQuery.data ?? []
  const helpTypes = helpTypesQuery.data ?? []

  function saveRecord(record: HelpRecordWithType) {
    queryClient.setQueryData<HelpRecordWithType[]>(
      helpRecordsKeys.privateByCase(caseId),
      (current = []) => [record, ...current],
    )
    setFormNeedIds(null)
  }

  function saveHelpType(helpType: HelpType) {
    queryClient.setQueryData<HelpType[]>(helpRecordsKeys.types(), (current = []) => {
      const withoutType = current.filter((item) => item.id !== helpType.id)
      return [...withoutType, helpType].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    })
  }

  function deleteRecord(recordId: string) {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteHelpRecordAction(caseId, recordId)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }
      queryClient.setQueryData<HelpRecordWithType[]>(
        helpRecordsKeys.privateByCase(caseId),
        (current = []) => current.filter((record) => record.id !== recordId),
      )
      setPendingDeleteId(null)
    })
  }

  const createAction = (values: HelpRecordFormValues) => createHelpRecordAction(caseId, values)

  return (
    <section className="bg-card border-border mt-6 rounded-2xl border p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-foreground text-lg font-medium">Historial de ayuda</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {records.length === 0
              ? 'Todavía no se ha registrado ayuda.'
              : `${records.length} ${records.length === 1 ? 'registro' : 'registros'} de ayuda.`}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setFormNeedIds([])}
            disabled={needs.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            title={needs.length === 0 ? 'Agrega una necesidad antes de registrar ayuda' : undefined}
          >
            <Plus className="size-4" />
            Registrar ayuda
          </button>
        )}
      </div>

      {deleteError && (
        <p className="bg-destructive/10 text-destructive mb-4 rounded-xl p-3 text-sm">
          {deleteError}
        </p>
      )}

      {!readOnly && needs.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {needs.map((need) => (
            <button
              key={need.id}
              type="button"
              onClick={() => setFormNeedIds([need.id])}
              className="border-primary/30 text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <HandHeart className="size-3.5" />
              Marcar ayuda · {need.category.name}
            </button>
          ))}
        </div>
      )}

      {recordsQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-10">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Cargando historial…</span>
        </div>
      ) : records.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center">
          <div className="bg-accent flex size-12 items-center justify-center rounded-full">
            <HandHeart className="text-foreground size-6" />
          </div>
          <div>
            <p className="font-display text-foreground font-medium">Sin ayudas todavía</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Los registros aparecerán aquí y anónimamente en la ficha pública.
            </p>
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {records.map((record) => {
            const associatedNeeds = needs.filter((need) => record.caseNeedIds.includes(need.id))
            return (
              <li key={record.id} className="bg-muted rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {record.helpType.name}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                        <CalendarDays className="size-3.5" />
                        {formatDate(record.helped_at)}
                      </span>
                    </div>
                    <h3 className="text-foreground mt-2 font-semibold">{record.title}</h3>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(record.id)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full p-2 transition-colors"
                      aria-label={`Eliminar ${record.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {record.description && (
                  <p className="text-foreground/80 mt-2 text-sm leading-relaxed">
                    {record.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {associatedNeeds.map((need) => (
                    <span
                      key={need.id}
                      className="bg-background text-muted-foreground rounded-full px-2.5 py-1 text-xs"
                    >
                      {need.category.name}
                    </span>
                  ))}
                  {record.amount_usd !== null && (
                    <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 font-mono text-xs font-semibold">
                      {record.amount_usd} USD
                    </span>
                  )}
                </div>

                <div className="border-border mt-3 border-t pt-3">
                  <p className="text-muted-foreground text-xs">
                    Registrado por {record.createdBy?.fullName ?? record.created_by_user_id ?? '—'}
                  </p>
                  {record.private_notes && (
                    <p className="text-foreground mt-1 text-sm">
                      <span className="font-semibold">Nota privada:</span> {record.private_notes}
                    </p>
                  )}
                </div>

                {pendingDeleteId === record.id && (
                  <div className="border-destructive/20 bg-background mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                    <p className="text-foreground text-xs">¿Eliminar este registro?</p>
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
                        onClick={() => deleteRecord(record.id)}
                        disabled={isDeleting}
                        className="text-destructive text-xs font-semibold disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {formNeedIds !== null && (
        <HelpRecordFormModal
          action={createAction}
          helpTypes={helpTypes}
          initialNeedIds={formNeedIds}
          needs={needs}
          onClose={() => setFormNeedIds(null)}
          onHelpTypeCreated={saveHelpType}
          onSaved={saveRecord}
        />
      )}
    </section>
  )
}
