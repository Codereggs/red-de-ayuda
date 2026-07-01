'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createHelperAction } from '../actions/users.actions'
import { createHelperFormSchema, type CreateHelperFormValues } from '../schemas/auth.schema'

export function CreateHelperForm() {
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateHelperFormValues>({
    resolver: zodResolver(createHelperFormSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit((data) => {
    setGlobalError(null)
    setSuccessMessage(null)
    startTransition(async () => {
      const result = await createHelperAction(data)
      if (!result.success) {
        setGlobalError(result.error)
        return
      }
      setSuccessMessage(`Helper "${result.data.full_name}" registrado y activo.`)
      reset()
    })
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 max-w-md">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-sm font-semibold text-foreground/80">
          Nombre completo
        </label>
        <input
          id="fullName"
          type="text"
          placeholder="Nombre y apellido"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-foreground/80">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="helper@email.com"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-foreground/80">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {globalError && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
          {globalError}
        </p>
      )}

      {successMessage && (
        <p className="text-sm text-primary bg-secondary border border-border rounded-xl px-4 py-2.5">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/85 active:scale-[0.98] shadow-sm shadow-primary/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Registrando...' : 'Registrar helper'}
      </button>
    </form>
  )
}
