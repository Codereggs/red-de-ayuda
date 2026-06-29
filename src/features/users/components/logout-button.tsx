'use client'

import { useTransition } from 'react'
import { logoutAction } from '../actions/auth.actions'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      className={
        className ??
        'w-full text-left px-3.5 py-1.5 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed'
      }
    >
      {isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </button>
  )
}
