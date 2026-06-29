import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { CaseForm } from '@/features/cases/components/case-form'
import { createCaseAction } from '@/features/cases/actions/cases.actions'

export default async function NewCasePage() {
  await requireAuth()

  const client = await createServerSupabaseClient()
  const repo = createCasesRepository(client)
  const situationCategories = await repo.listSituationCategories()

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/dashboard/cases"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a casos
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-foreground text-3xl font-medium">Crear caso</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
        </p>
      </div>

      <CaseForm action={createCaseAction} situationCategories={situationCategories} mode="create" />
    </div>
  )
}
