import { requireAdmin } from '@/shared/lib/auth/guards'
import { createServiceSupabaseClient } from '@/shared/lib/supabase/server'
import { createUsersRepository } from '@/features/users/repositories/users.repository'
import { UsersPanel } from '@/features/users/components/users-panel'

export default async function UsersPage() {
  const { profile } = await requireAdmin()

  const client = createServiceSupabaseClient()
  const users = await createUsersRepository(client).listAll()

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-foreground text-3xl font-medium">Usuarios</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Gestiona las cuentas del equipo: activa o desactiva accesos y registra nuevos helpers.
      </p>

      <UsersPanel users={users} currentUserId={profile.id} />
    </div>
  )
}
