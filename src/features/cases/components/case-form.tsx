'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createOrUpdateCaseSchema, type CreateOrUpdateCaseValues } from '../schemas/cases.schema'
import { PhoneFieldArray } from './phone-field-array'
import type { ActionResult } from '@/shared/types/action-result'
import { DEFAULT_COUNTRY } from '@/shared/constants'

interface CaseFormProps {
  action: (data: CreateOrUpdateCaseValues) => Promise<ActionResult<void>>
  defaultValues?: Partial<CreateOrUpdateCaseValues>
  mode?: 'create' | 'edit'
}

export function CaseForm({ action, defaultValues, mode = 'create' }: CaseFormProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<CreateOrUpdateCaseValues>({
    resolver: zodResolver(createOrUpdateCaseSchema),
    mode: 'onChange',
    defaultValues: {
      country: DEFAULT_COUNTRY,
      caseType: 'person',
      phones: [{ phone: '', label: '', isPrimary: true }],
      ...defaultValues,
    },
  })

  function onSubmit(data: CreateOrUpdateCaseValues) {
    startTransition(async () => {
      const result = await action(data)
      if (result && !result.success) {
        setError('root', { message: result.error })
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            setError(field as keyof CreateOrUpdateCaseValues, {
              message: (messages as string[])[0],
            })
          })
        }
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

      {/* Sección 1: Información pública */}
      <section className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6">
        <h2 className="font-display text-foreground text-lg font-medium">Información pública</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">
              Nombre completo <span className="text-destructive">*</span>
            </label>
            <input
              {...register('fullName')}
              type="text"
              placeholder="Nombre y apellido"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.fullName && (
              <p className="text-destructive text-xs">{errors.fullName.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Tipo de caso <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-4 pt-1">
              {(['person', 'family'] as const).map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    {...register('caseType')}
                    type="radio"
                    value={type}
                    className="accent-primary"
                  />
                  {type === 'person' ? 'Persona' : 'Familia'}
                </label>
              ))}
            </div>
            {errors.caseType && (
              <p className="text-destructive text-xs">{errors.caseType.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Descripción corta <span className="text-destructive">*</span>
            </label>
            <input
              {...register('shortDescription')}
              type="text"
              placeholder="Ej: Damnificada, Caso médico…"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.shortDescription && (
              <p className="text-destructive text-xs">{errors.shortDescription.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">
              Lugar de contacto público <span className="text-destructive">*</span>
            </label>
            <input
              {...register('publicContactPlace')}
              type="text"
              placeholder="Ej: Caracas, Libertador"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.publicContactPlace && (
              <p className="text-destructive text-xs">{errors.publicContactPlace.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Estado <span className="text-destructive">*</span>
            </label>
            <input
              {...register('state')}
              type="text"
              placeholder="Ej: Miranda"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Ciudad <span className="text-destructive">*</span>
            </label>
            <input
              {...register('city')}
              type="text"
              placeholder="Ej: Caracas"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.city && <p className="text-destructive text-xs">{errors.city.message}</p>}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">Notas públicas</label>
            <textarea
              {...register('publicNotes')}
              rows={3}
              placeholder="Descripción breve visible para el público…"
              className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.publicNotes && (
              <p className="text-destructive text-xs">{errors.publicNotes.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Sección 2: Datos privados */}
      <section className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6">
        <div>
          <h2 className="font-display text-foreground text-lg font-medium">Datos privados</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Solo visible para administradores y colaboradores.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">
              Número de cédula <span className="text-destructive">*</span>
            </label>
            <input
              {...register('privateData.idNumber')}
              type="text"
              placeholder="V-12345678"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.privateData?.idNumber && (
              <p className="text-destructive text-xs">{errors.privateData.idNumber.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-foreground text-sm font-medium">Fecha de nacimiento</label>
            <input
              {...register('privateData.birthDate')}
              type="date"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">
              Dirección anterior <span className="text-destructive">*</span>
            </label>
            <input
              {...register('privateData.previousFullAddress')}
              type="text"
              placeholder="Dirección completa anterior"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.privateData?.previousFullAddress && (
              <p className="text-destructive text-xs">
                {errors.privateData.previousFullAddress.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">
              Dirección actual <span className="text-destructive">*</span>
            </label>
            <input
              {...register('privateData.currentFullAddress')}
              type="text"
              placeholder="Dirección completa actual"
              className="border-input bg-background focus-visible:ring-primary/50 rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.privateData?.currentFullAddress && (
              <p className="text-destructive text-xs">
                {errors.privateData.currentFullAddress.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">
              Notas de verificación <span className="text-destructive">*</span>
            </label>
            <textarea
              {...register('privateData.verificationNotes')}
              rows={3}
              placeholder="¿Cómo se verificó este caso?"
              className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
            {errors.privateData?.verificationNotes && (
              <p className="text-destructive text-xs">
                {errors.privateData.verificationNotes.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-foreground text-sm font-medium">Notas privadas</label>
            <textarea
              {...register('privateData.privateNotes')}
              rows={2}
              placeholder="Notas internas…"
              className="border-input bg-background focus-visible:ring-primary/50 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
          </div>
        </div>
      </section>

      {/* Sección 3: Teléfonos */}
      <section className="bg-card border-border flex flex-col gap-4 rounded-2xl border p-6">
        <div>
          <h2 className="font-display text-foreground text-lg font-medium">
            Teléfonos de contacto
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Al menos uno requerido. Visible tras confirmación de uso responsable.
          </p>
        </div>
        <PhoneFieldArray control={control} errors={errors} />
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dashboard/cases"
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
          {mode === 'create' ? 'Crear caso' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
