import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { CaseForm } from '@/features/cases/components/case-form'
import { updateCaseAction } from '@/features/cases/actions/cases.actions'
import type { CreateOrUpdateCaseValues } from '@/features/cases/schemas/cases.schema'

interface EditCasePageProps {
  params: Promise<{ id: string }>
}

export default async function EditCasePage({ params }: EditCasePageProps) {
  const { id } = await params
  await requireAuth()

  const client = await createServerSupabaseClient()
  const repo = createCasesRepository(client)

  const [caseRow, privateData, phones] = await Promise.all([
    repo.findPrivateById(id),
    repo.findPrivateDataByCaseId(id),
    repo.findPhonesByCaseId(id),
  ])

  if (!caseRow) notFound()

  const defaultValues: Partial<CreateOrUpdateCaseValues> = {
    fullName: caseRow.full_name,
    caseType: caseRow.case_type,
    shortDescription: caseRow.short_description ?? undefined,
    publicContactPlace: caseRow.public_contact_place ?? undefined,
    country: caseRow.country ?? undefined,
    state: caseRow.state ?? undefined,
    city: caseRow.city ?? undefined,
    publicNotes: caseRow.public_notes ?? undefined,
    privateData: privateData
      ? {
          idNumber: privateData.id_number ?? '',
          birthDate: privateData.birth_date ?? undefined,
          previousFullAddress: privateData.previous_full_address ?? '',
          currentFullAddress: privateData.current_full_address ?? '',
          verificationNotes: privateData.verification_notes ?? '',
          privateNotes: privateData.private_notes ?? undefined,
        }
      : undefined,
    phones: phones.map((p) => ({
      phone: p.phone,
      label: p.label ?? undefined,
      isPrimary: p.is_primary,
    })),
  }

  const boundAction = updateCaseAction.bind(null, id)

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/dashboard/cases/${id}`}
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver al caso
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-foreground text-3xl font-medium">Editar caso</h1>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {caseRow.public_code} — {caseRow.full_name}
        </p>
      </div>

      <CaseForm action={boundAction} defaultValues={defaultValues} mode="edit" />
    </div>
  )
}
