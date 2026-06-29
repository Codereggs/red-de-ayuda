import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { StatusBadge, CaseTypeBadge } from '@/features/cases/components/status-badge'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function CasesPage() {
  await requireAuth()

  const client = await createServerSupabaseClient()
  const repo = createCasesRepository(client)
  const result = await repo.listPrivate({})
  const cases = result.data

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-foreground text-3xl font-medium">Casos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {cases.length} {cases.length === 1 ? 'caso' : 'casos'} cargados
          </p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" />
          Nuevo caso
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="bg-card border-border rounded-2xl border p-12 text-center">
          <p className="text-muted-foreground text-sm">No hay casos registrados aún.</p>
          <Link
            href="/dashboard/cases/new"
            className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <Plus className="size-4" />
            Crear el primer caso
          </Link>
        </div>
      ) : (
        <div className="bg-card border-border overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/40 border-b">
                <th className="text-muted-foreground px-5 py-3.5 text-left font-mono text-xs font-medium">
                  Código
                </th>
                <th className="text-muted-foreground px-5 py-3.5 text-left text-xs font-medium">
                  Nombre
                </th>
                <th className="text-muted-foreground hidden px-5 py-3.5 text-left text-xs font-medium sm:table-cell">
                  Tipo
                </th>
                <th className="text-muted-foreground hidden px-5 py-3.5 text-left text-xs font-medium md:table-cell">
                  Ubicación
                </th>
                <th className="text-muted-foreground px-5 py-3.5 text-left text-xs font-medium">
                  Estado
                </th>
                <th className="text-muted-foreground hidden px-5 py-3.5 text-left text-xs font-medium lg:table-cell">
                  Creado
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-muted-foreground font-mono text-xs">{c.public_code}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-foreground font-medium">{c.full_name}</span>
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <CaseTypeBadge type={c.case_type} />
                  </td>
                  <td className="text-muted-foreground hidden px-5 py-4 text-xs md:table-cell">
                    {c.city}, {c.state}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="text-muted-foreground hidden px-5 py-4 font-mono text-xs lg:table-cell">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
