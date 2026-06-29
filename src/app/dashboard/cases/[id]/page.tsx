import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { StatusBadge, CaseTypeBadge } from '@/features/cases/components/status-badge'
import { createNeedsRepository } from '@/features/needs/repositories/needs.repository'
import { NeedsManager } from '@/features/needs/components/needs-manager'
import { createHelpRecordsRepository } from '@/features/help-records/repositories/help-records.repository'
import { HelpRecordsManager } from '@/features/help-records/components/help-records-manager'
import { CaseArchiveButton } from './case-archive-button'

interface CasePageProps {
  params: Promise<{ id: string }>
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground text-sm">{value ?? '—'}</dd>
    </div>
  )
}

export default async function CasePage({ params }: CasePageProps) {
  const { id } = await params
  await requireAuth()

  const client = await createServerSupabaseClient()
  const repo = createCasesRepository(client)
  const needsRepo = createNeedsRepository(client)
  const helpRecordsRepo = createHelpRecordsRepository(client)

  const [caseRow, privateData, phones, needs, needCategories, helpRecords, helpTypes] =
    await Promise.all([
      repo.findPrivateById(id),
      repo.findPrivateDataByCaseId(id),
      repo.findPhonesByCaseId(id),
      needsRepo.listByCaseId(id),
      needsRepo.listCategories(),
      helpRecordsRepo.listPrivateByCaseId(id),
      helpRecordsRepo.listHelpTypes(),
    ])

  if (!caseRow) notFound()
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/dashboard/cases"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a casos
      </Link>

      <div className="bg-card border-border mb-6 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-mono text-xs">{caseRow.public_code}</p>
            <h1 className="font-display text-foreground mt-1 text-2xl font-medium sm:text-3xl">
              {caseRow.full_name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={caseRow.status} />
              <CaseTypeBadge type={caseRow.case_type} />
              {caseRow.verified && (
                <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  Verificado
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/cases/${id}/edit`}
              className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm transition-colors"
            >
              <Pencil className="size-4" />
              Editar
            </Link>
            {caseRow.status === 'active' && (
              <CaseArchiveButton caseId={id} caseName={caseRow.full_name} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-4 text-base font-medium">
            Información pública
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <InfoRow label="Descripción corta" value={caseRow.short_description} />
            <InfoRow label="País" value={caseRow.country} />
            <InfoRow label="Estado" value={caseRow.state} />
            <InfoRow label="Ciudad" value={caseRow.city} />
            <div className="col-span-2">
              <InfoRow label="Lugar de contacto" value={caseRow.public_contact_place} />
            </div>
            {caseRow.public_notes && (
              <div className="col-span-2">
                <InfoRow label="Notas públicas" value={caseRow.public_notes} />
              </div>
            )}
            <InfoRow label="Última ayuda" value={formatDate(caseRow.last_helped_at)} />
            <InfoRow label="Creado" value={formatDate(caseRow.created_at)} />
          </dl>
        </section>

        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-4 text-base font-medium">
            Datos privados
          </h2>
          {privateData ? (
            <dl className="flex flex-col gap-4">
              <InfoRow label="Cédula" value={privateData.id_number} />
              <InfoRow label="Fecha de nacimiento" value={formatDate(privateData.birth_date)} />
              <InfoRow label="Dirección anterior" value={privateData.previous_full_address} />
              <InfoRow label="Dirección actual" value={privateData.current_full_address} />
              <InfoRow label="Notas de verificación" value={privateData.verification_notes} />
              {privateData.private_notes && (
                <InfoRow label="Notas privadas" value={privateData.private_notes} />
              )}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">Sin datos privados registrados.</p>
          )}
        </section>

        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-4 text-base font-medium">
            Teléfonos de contacto
          </h2>
          {phones.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {phones.map((p) => (
                <li
                  key={p.id}
                  className="bg-muted flex items-center justify-between rounded-xl p-3"
                >
                  <div>
                    <p className="text-foreground font-mono text-sm">{p.phone}</p>
                    {p.label && <p className="text-muted-foreground mt-0.5 text-xs">{p.label}</p>}
                  </div>
                  {p.is_primary && (
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                      Principal
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Sin teléfonos registrados.</p>
          )}
        </section>

        <NeedsManager
          caseId={id}
          initialNeeds={needs}
          initialCategories={needCategories}
          readOnly={caseRow.status === 'archived'}
        />
      </div>

      <HelpRecordsManager
        caseId={id}
        initialRecords={helpRecords}
        initialHelpTypes={helpTypes}
        needs={needs}
        readOnly={caseRow.status === 'archived'}
      />

      {caseRow.status === 'archived' && caseRow.archive_reason && (
        <div className="bg-card border-border mt-6 rounded-2xl border p-6">
          <h2 className="font-display text-foreground mb-2 text-base font-medium">
            Motivo de archivo
          </h2>
          <p className="text-foreground text-sm">{caseRow.archive_reason}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Archivado el {formatDate(caseRow.archived_at)}
          </p>
        </div>
      )}
    </div>
  )
}
