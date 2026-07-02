'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileValues,
  type ChangePasswordValues,
} from '../schemas/auth.schema'
import { updateOwnProfileAction, changePasswordAction } from '../actions/users.actions'

interface ProfileSettingsProps {
  fullName: string
  email: string
}

const inputClass =
  'border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:ring-primary/30 w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2'
const labelClass = 'text-foreground/80 text-sm font-semibold'
const cardClass = 'bg-card border-border rounded-2xl border p-6'
const submitClass =
  'bg-primary text-primary-foreground hover:bg-primary/85 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60'

export function ProfileSettings({ fullName, email }: ProfileSettingsProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileDataForm fullName={fullName} email={email} />
      <PasswordForm />
    </div>
  )
}

function ProfileDataForm({ fullName, email }: ProfileSettingsProps) {
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName },
  })

  const onSubmit = handleSubmit((data) => {
    setGlobalError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await updateOwnProfileAction(data)
      if (!result.success) {
        setGlobalError(result.error)
        toast.error(result.error)
        return
      }
      setSuccess('Datos actualizados correctamente.')
      toast.success('Datos actualizados correctamente.')
    })
  })

  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <h2 className="font-display text-foreground text-base font-medium">Mis datos</h2>
      <p className="text-muted-foreground mt-1 text-sm">Actualiza tu nombre visible.</p>

      <div className="mt-5 flex max-w-md flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className={labelClass}>
            Nombre completo
          </label>
          <input id="fullName" type="text" className={inputClass} {...register('fullName')} />
          {errors.fullName && <p className="text-destructive text-xs">{errors.fullName.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            className={`${inputClass} cursor-not-allowed opacity-60`}
          />
          <p className="text-muted-foreground text-xs">
            El email no se puede cambiar. Contacta a un administrador si lo necesitas.
          </p>
        </div>

        {globalError && (
          <p className="text-destructive bg-destructive/10 border-destructive/20 rounded-xl border px-4 py-2.5 text-sm">
            {globalError}
          </p>
        )}
        {success && (
          <p className="text-primary bg-secondary border-border rounded-xl border px-4 py-2.5 text-sm">
            {success}
          </p>
        )}

        <button type="submit" disabled={isPending} className={submitClass}>
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit((data) => {
    setGlobalError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await changePasswordAction(data)
      if (!result.success) {
        if (result.fieldErrors?.currentPassword) {
          setError('currentPassword', { message: result.fieldErrors.currentPassword[0] })
        } else {
          setGlobalError(result.error)
        }
        toast.error(result.error)
        return
      }
      setSuccess('Contraseña cambiada correctamente.')
      toast.success('Contraseña cambiada correctamente.')
      reset()
    })
  })

  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <h2 className="font-display text-foreground text-base font-medium">Cambiar contraseña</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Necesitas tu contraseña actual para establecer una nueva.
      </p>

      <div className="mt-5 flex max-w-md flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="currentPassword" className={labelClass}>
            Contraseña actual
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register('currentPassword')}
          />
          {errors.currentPassword && (
            <p className="text-destructive text-xs">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className={labelClass}>
            Nueva contraseña
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="text-destructive text-xs">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirmar nueva contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
          )}
        </div>

        {globalError && (
          <p className="text-destructive bg-destructive/10 border-destructive/20 rounded-xl border px-4 py-2.5 text-sm">
            {globalError}
          </p>
        )}
        {success && (
          <p className="text-primary bg-secondary border-border rounded-xl border px-4 py-2.5 text-sm">
            {success}
          </p>
        )}

        <button type="submit" disabled={isPending} className={submitClass}>
          {isPending ? 'Cambiando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  )
}
