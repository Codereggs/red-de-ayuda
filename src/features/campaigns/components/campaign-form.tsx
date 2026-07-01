'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { campaignFormSchema, type CampaignFormValues } from '../schemas/campaigns.schema'
import type { ActionResult } from '@/shared/types/action-result'

interface CampaignFormProps {
  action: (data: CampaignFormValues) => Promise<ActionResult<void>>
  defaultValues?: Partial<CampaignFormValues>
  mode?: 'create' | 'edit'
}

export function CampaignForm({ action, defaultValues, mode = 'create' }: CampaignFormProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isValid },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    mode: 'onChange',
    defaultValues,
  })

  const helperContactUrl = watch('helperContactUrl')
  const hasHelperLink = !!helperContactUrl?.trim()

  function onSubmit(data: CampaignFormValues) {
    startTransition(async () => {
      const result = await action(data)
      if (result && !result.success) {
        setError('root', { message: result.error })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      {errors.root && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
          {errors.root.message}
        </div>
      )}

      <section className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6">
        <h2 className="font-display text-foreground text-lg font-medium">
          Información de la campaña
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">
              Título <span className="text-destructive">*</span>
            </label>
            <input
              {...register('title')}
              type="text"
              placeholder="Ej: Jornada de ayuda a familias damnificadas"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">Descripción</label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Describe el propósito de esta campaña…"
              className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Meta de recaudación (USD) <span className="text-destructive">*</span>
            </label>
            <input
              {...register('goalAmountUsd', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.goalAmountUsd && (
              <p className="text-destructive text-xs">{errors.goalAmountUsd.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6">
        <div>
          <h2 className="font-display text-foreground text-lg font-medium">
            Sumar helpers (opcional)
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Link para que quienes vean la campaña pública puedan pedir unirse como helpers.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-foreground text-sm font-medium">Link de contacto</label>
          <input
            {...register('helperContactUrl')}
            type="url"
            inputMode="url"
            placeholder="https://wa.me/58412… o https://forms.gle/…"
            className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
          />
          {errors.helperContactUrl && (
            <p className="text-destructive text-xs">{errors.helperContactUrl.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            className={`text-sm font-medium ${hasHelperLink ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            Párrafo que acompaña el link
          </label>
          <textarea
            {...register('helperContactNote')}
            rows={3}
            disabled={!hasHelperLink}
            placeholder={
              hasHelperLink
                ? 'Ej: ¿Quieres ayudar? Escríbenos y súmate como helper de esta campaña.'
                : 'Agrega primero un link de contacto para habilitar este texto.'
            }
            className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {errors.helperContactNote && (
            <p className="text-destructive text-xs">{errors.helperContactNote.message}</p>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dashboard/campaigns"
          className="border-border text-foreground hover:bg-muted rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending || !isValid}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {mode === 'create' ? 'Crear campaña' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
