import { requireAdmin } from '@/shared/lib/auth/guards'

export default async function LogsPage() {
  await requireAdmin()
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-medium text-foreground">Historial de accesos</h1>
      <p className="text-muted-foreground text-sm mt-2">
        Próximamente — logs de acceso a datos de asistencia.
      </p>
    </div>
  )
}
