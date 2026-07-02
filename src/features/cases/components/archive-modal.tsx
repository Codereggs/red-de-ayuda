'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { archiveCaseSchema, type ArchiveCaseValues } from '../schemas/cases.schema'
import type { ActionResult } from '@/shared/types/action-result'

interface ArchiveModalProps {
  caseName: string
  action: (data: ArchiveCaseValues) => Promise<ActionResult<void>>
  onClose: () => void
}

export function ArchiveModal({ caseName, action, onClose }: ArchiveModalProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ArchiveCaseValues>({
    resolver: zodResolver(archiveCaseSchema),
  })

  function onSubmit(data: ArchiveCaseValues) {
    startTransition(async () => {
      const result = await action(data)
      if (result && !result.success) {
        setError('root', { message: result.error })
        toast.error(result.error)
      }
    })
  }

  return (
    <div
      className="bg-foreground/30 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background w-full max-w-md rounded-2xl shadow-xl">
        <div className="border-border flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 flex size-10 items-center justify-center rounded-xl">
              <AlertTriangle className="text-destructive size-5" />
            </div>
            <div>
              <h2 className="font-display text-foreground text-lg font-medium">Archivar caso</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">{caseName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-muted text-muted-foreground rounded-lg p-2 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6">
          <p className="text-muted-foreground text-sm">
            El caso dejará de aparecer en el registro público. Esta acción puede revertirse por un
            administrador.
          </p>

          {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium">
              Motivo de archivo <span className="text-destructive">*</span>
            </label>
            <textarea
              {...register('archiveReason')}
              rows={3}
              placeholder="Describe el motivo del archivo…"
              className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.archiveReason && (
              <p className="text-destructive text-xs">{errors.archiveReason.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Archivar caso
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
