'use client'

import { useRef, useTransition, useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X } from 'lucide-react'
import { createContributionAction } from '../actions/campaigns.actions'
import { contributionFormSchema, type ContributionFormValues } from '../schemas/campaigns.schema'
import { uploadReceiptFromClient } from '@/shared/lib/supabase/storage.client'
import type { CampaignContribution } from '@/shared/types/database.types'

interface ContributionFormModalProps {
  campaignId: string
  onSuccess?: (contribution: CampaignContribution) => void
  onClose: () => void
}

export function ContributionFormModal({
  campaignId,
  onSuccess,
  onClose,
}: ContributionFormModalProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema),
    mode: 'onChange',
    defaultValues: {
      transferredAt: new Date().toISOString().slice(0, 10),
    },
  })

  function onSubmit(data: ContributionFormValues) {
    setServerError(null)
    startTransition(async () => {
      let receiptImagePath: string | undefined

      const file = fileRef.current?.files?.[0]
      if (file && file.size > 0) {
        try {
          setUploadingFile(true)
          receiptImagePath = await uploadReceiptFromClient(campaignId, file)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error al subir el comprobante.'
          setServerError(message)
          toast.error(message)
          setUploadingFile(false)
          return
        }
        setUploadingFile(false)
      }

      const result = await createContributionAction(campaignId, {
        ...data,
        receiptImagePath,
      })

      if (!result.success) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('Aporte registrado.')
      onSuccess?.(result.data)
      onClose()
    })
  }

  const busy = isPending || uploadingFile

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-background/80 absolute inset-0 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border-border relative w-full max-w-md rounded-2xl border shadow-xl">
        <div className="flex items-center justify-between border-b border-inherit p-5">
          <h2 className="font-display text-foreground text-lg font-medium">Registrar aporte</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5">
          {serverError && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-foreground text-sm font-medium">
                Monto (USD) <span className="text-destructive">*</span>
              </label>
              <input
                {...register('amountUsd', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
              />
              {errors.amountUsd && (
                <p className="text-destructive text-xs">{errors.amountUsd.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-foreground text-sm font-medium">
                Fecha de transferencia <span className="text-destructive">*</span>
              </label>
              <input
                {...register('transferredAt')}
                type="date"
                className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
              />
              {errors.transferredAt && (
                <p className="text-destructive text-xs">{errors.transferredAt.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">Nombre del donante</label>
            <input
              {...register('contributorName')}
              type="text"
              placeholder="Opcional"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">Referencia bancaria</label>
            <input
              {...register('reference')}
              type="text"
              placeholder="Número de referencia"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Comprobante de transferencia
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="border-input bg-background text-muted-foreground rounded-lg border px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-transparent file:text-xs file:font-semibold"
            />
            {uploadingFile && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="size-3 animate-spin" />
                Subiendo comprobante…
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">Notas</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Observaciones internas…"
              className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !isValid}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {uploadingFile ? 'Subiendo…' : 'Registrar aporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
