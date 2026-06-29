import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession, isActiveHelperOrAdmin } from '@/shared/lib/auth/get-session'
import { createServiceSupabaseClient } from '@/shared/lib/supabase/server'
import type { Database } from '@/shared/types/database.types'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { checkRevealRateLimit, hashIp } from '@/shared/lib/rate-limit'

type AccessLogInsert = Database['public']['Tables']['assistance_method_access_logs']['Insert']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params
  if (!z.string().uuid().safeParse(caseId).success) {
    return Response.json({ error: 'Identificador de caso inválido.' }, { status: 400 })
  }

  try {
    const session = await getSession()
    if (!isActiveHelperOrAdmin(session)) {
      return Response.json(
        { error: 'Debes iniciar sesión como helper para ver los datos de contacto.' },
        { status: 401 },
      )
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const rawIp = forwarded
      ? forwarded.split(',')[0].trim()
      : (req.headers.get('x-real-ip') ?? 'unknown')
    const ipHash = hashIp(rawIp)
    const rl = checkRevealRateLimit(ipHash)

    if (!rl.ok) {
      return Response.json({ error: rl.error }, { status: 429 })
    }

    const serviceClient = createServiceSupabaseClient()
    const repo = createCasesRepository(serviceClient)
    const publicCase = await repo.findPublicById(caseId)

    if (!publicCase) {
      return Response.json({ error: 'Caso no encontrado.' }, { status: 404 })
    }

    const payload = await repo.revealAssistance(caseId)

    const logs: AccessLogInsert[] =
      payload.assistanceMethods.length > 0
        ? payload.assistanceMethods.map((method) => ({
            case_id: caseId,
            assistance_method_id: method.id,
            action: 'viewed' as const,
            ip_hash: ipHash,
            user_agent: req.headers.get('user-agent') ?? '',
          }))
        : [
            {
              case_id: caseId,
              assistance_method_id: null,
              action: 'viewed' as const,
              ip_hash: ipHash,
              user_agent: req.headers.get('user-agent') ?? '',
            },
          ]

    const { error: logError } = await serviceClient
      .from('assistance_method_access_logs')
      .insert(logs)
    if (logError) throw new Error(`[reveal-assistance-methods - log] ${logError.message}`)

    return Response.json(payload)
  } catch (err) {
    console.error('[reveal-assistance-methods]', err)
    return Response.json({ error: 'Error al obtener los datos de asistencia.' }, { status: 500 })
  }
}
