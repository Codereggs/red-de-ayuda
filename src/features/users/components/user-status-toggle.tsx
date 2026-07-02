'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { toggleUserStatusAction } from '../actions/users.actions'

interface UserStatusToggleProps {
  userId: string
  initialActive: boolean
  disabled?: boolean
  onError?: (message: string) => void
}

export function UserStatusToggle({
  userId,
  initialActive,
  disabled = false,
  onError,
}: UserStatusToggleProps) {
  const [active, setActive] = useState(initialActive)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !active
    setActive(next) // optimista
    startTransition(async () => {
      const result = await toggleUserStatusAction({ userId, active: next })
      if (!result.success) {
        setActive(!next) // revertir
        onError?.(result.error)
        toast.error(result.error)
      } else {
        toast.success(next ? 'Usuario activado.' : 'Usuario desactivado.')
      }
    })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled || isPending}
      onClick={handleToggle}
      className={`focus:ring-primary/40 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span className="sr-only">{active ? 'Desactivar usuario' : 'Activar usuario'}</span>
      <span
        className={`bg-background inline-block size-5 transform rounded-full shadow-sm transition-transform ${
          active ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
