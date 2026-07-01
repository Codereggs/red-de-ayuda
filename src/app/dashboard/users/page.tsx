import { requireAdmin } from '@/shared/lib/auth/guards'
import { CreateHelperForm } from '@/features/users/components/create-helper-form'

export default async function UsersPage() {
  await requireAdmin()
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-medium text-foreground">Usuarios</h1>
      <p className="text-muted-foreground text-sm mt-2">
        Registra una cuenta de helper. Queda activa de inmediato, sin correo de confirmación.
      </p>

      <div className="mt-8">
        <CreateHelperForm />
      </div>
    </div>
  )
}
