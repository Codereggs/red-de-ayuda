'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X } from 'lucide-react'
import { archiveCampaignAction } from '../actions/campaigns.actions'
import { archiveCampaignSchema, type ArchiveCampaignValues } from '../schemas/campaigns.schema'

interface ArchiveCampaignModalProps {
  campaignId: string
  campaignTitle: string
  onClose: () => void
}

export function ArchiveCampaignModal({
  campaignId,
  campaignTitle,
  onClose,
}: ArchiveCampaignModalProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ArchiveCampaignValues>({
    resolver: zodResolver(archiveCampaignSchema),
    mode: 'onChange',
  })

  function onSubmit(data: ArchiveCampaignValues) {
    setServerError(null)
    startTransition(async () => {
      const result = await archiveCampaignAction(campaignId, data)
      if (result && !result.success) {
        setServerError(result.error)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-background/80 absolute inset-0 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border-border relative w-full max-w-md rounded-2xl border shadow-xl">
        <div className="flex items-center justify-between border-b border-inherit p-5">
          <h2 className="font-display text-foreground text-lg font-medium">Archivar campaña</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5">
          <p className="text-muted-foreground text-sm">
            Estás por archivar <span className="text-foreground font-medium">{campaignTitle}</span>.
            Esta acción la quitará de la vista pública.
          </p>

          {serverError && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
              {serverError}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Motivo de archivo <span className="text-destructive">*</span>
            </label>
            <textarea
              {...register('archiveReason')}
              rows={3}
              placeholder="¿Por qué se archiva esta campaña?"
              className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.archiveReason && (
              <p className="text-destructive text-xs">{errors.archiveReason.message}</p>
            )}
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
              disabled={isPending || !isValid}
              className="bg-destructive text-white hover:bg-destructive/90 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Archivar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
