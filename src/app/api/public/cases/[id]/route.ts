import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { createHelpRecordsRepository } from '@/features/help-records/repositories/help-records.repository'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: 'Identificador de caso inválido.' }, { status: 400 })
  }

  try {
    const client = await createServerSupabaseClient()
    const casesRepository = createCasesRepository(client)
    const helpRecordsRepository = createHelpRecordsRepository(client)
    const [caseData, helpRecords] = await Promise.all([
      casesRepository.findPublicById(id),
      helpRecordsRepository.listPublicByCaseId(id),
    ])

    if (!caseData) {
      return Response.json({ error: 'Caso no encontrado.' }, { status: 404 })
    }

    return Response.json({ data: { ...caseData, helpRecords } })
  } catch (error) {
    console.error('[GET /api/public/cases/:id]', error)
    return Response.json({ error: 'No se pudo cargar el caso.' }, { status: 500 })
  }
}
