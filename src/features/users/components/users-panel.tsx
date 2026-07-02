'use client'

import { useState } from 'react'
import { UserPlus, Users as UsersIcon } from 'lucide-react'
import { CreateHelperForm } from './create-helper-form'
import { UserStatusToggle } from './user-status-toggle'
import type { Profile } from '@/shared/types/database.types'

interface UsersPanelProps {
  users: Profile[]
  currentUserId: string
}

const ROLE_LABELS: Record<Profile['role'], string> = {
  admin: 'Administrador',
  campaign_admin: 'Admin de campañas',
  helper: 'Helper',
}

type Tab = 'list' | 'create'

export function UsersPanel({ users, currentUserId }: UsersPanelProps) {
  const [tab, setTab] = useState<Tab>('list')
  const [rowError, setRowError] = useState<string | null>(null)

  return (
    <div className="mt-8">
      <div className="border-border flex gap-1 border-b">
        <TabButton active={tab === 'list'} onClick={() => setTab('list')} icon={UsersIcon}>
          Usuarios ({users.length})
        </TabButton>
        <TabButton active={tab === 'create'} onClick={() => setTab('create')} icon={UserPlus}>
          Crear usuario
        </TabButton>
      </div>

      {tab === 'list' ? (
        <div className="mt-6">
          {rowError && (
            <p className="text-destructive bg-destructive/10 border-destructive/20 mb-4 rounded-xl border px-4 py-2.5 text-sm">
              {rowError}
            </p>
          )}
          <div className="bg-card border-border overflow-hidden rounded-2xl border">
            <ul className="divide-border divide-y">
              {users.map((user) => {
                const isSelf = user.id === currentUserId
                return (
                  <li
                    key={user.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-foreground truncate font-medium">{user.full_name}</p>
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                          {ROLE_LABELS[user.role]}
                        </span>
                        {isSelf && (
                          <span className="bg-accent/40 text-accent-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                            Tú
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-xs font-medium ${
                          user.status === 'active'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                      <UserStatusToggle
                        userId={user.id}
                        initialActive={user.status === 'active'}
                        disabled={isSelf}
                        onError={setRowError}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Un usuario inactivo pierde el acceso al panel de inmediato, aunque tenga sesión
            abierta. No puedes desactivar tu propia cuenta.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <CreateHelperForm />
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof UsersIcon
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'text-muted-foreground hover:text-foreground border-transparent'
      }`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}
