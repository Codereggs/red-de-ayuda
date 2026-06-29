import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { createHelpRecordsRepository } from '@/features/help-records/repositories/help-records.repository'
import { getSession, isActiveHelperOrAdmin } from '@/shared/lib/auth/get-session'
import { notFound } from 'next/navigation'
import { PublicCaseDetailClient } from './public-case-detail-client'

interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params

  const client = await createServerSupabaseClient()
  const repo = createCasesRepository(client)
  const helpRecordsRepo = createHelpRecordsRepository(client)
  const [caseData, helpRecords, session] = await Promise.all([
    repo.findPublicById(id),
    helpRecordsRepo.listPublicByCaseId(id),
    getSession(),
  ])

  if (!caseData) notFound()

  const isHelper = isActiveHelperOrAdmin(session)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver al listado
      </Link>

      <PublicCaseDetailClient case={caseData} helpRecords={helpRecords} isHelper={isHelper} />
    </main>
  )
}
