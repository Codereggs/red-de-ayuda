import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/shared/lib/supabase/server'
import { createCasesRepository } from '@/features/cases/repositories/cases.repository'
import { hashIp } from '@/shared/lib/rate-limit'

const copyLogSchema = z.object({
  caseId: z.string().uuid(),
  assistanceMethodId: z.string().uuid(),
  action: z.literal('copied'),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = copyLogSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: 'Datos de registro inválidos.' }, { status: 400 })
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const rawIp = forwarded
      ? forwarded.split(',')[0].trim()
      : (req.headers.get('x-real-ip') ?? 'unknown')
    const ipHash = hashIp(rawIp)
    const serviceClient = createServiceSupabaseClient()
    const repo = createCasesRepository(serviceClient)
    const publicCase = await repo.findPublicById(parsed.data.caseId)

    if (!publicCase) {
      return Response.json({ error: 'Caso no encontrado.' }, { status: 404 })
    }

    const { data: method, error: methodError } = await serviceClient
      .from('assistance_methods')
      .select('id')
      .eq('id', parsed.data.assistanceMethodId)
      .eq('case_id', parsed.data.caseId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (methodError) throw new Error(`[assistance-access-log - method] ${methodError.message}`)
    if (!method) {
      return Response.json({ error: 'Método de asistencia no encontrado.' }, { status: 404 })
    }

    const { error: logError } = await serviceClient.from('assistance_method_access_logs').insert({
      case_id: parsed.data.caseId,
      assistance_method_id: parsed.data.assistanceMethodId,
      action: parsed.data.action,
      ip_hash: ipHash,
      user_agent: req.headers.get('user-agent') ?? '',
    })

    if (logError) throw new Error(`[assistance-access-log - insert] ${logError.message}`)
    return Response.json({ success: true })
  } catch (error) {
    console.error('[assistance-access-log]', error)
    return Response.json({ error: 'No se pudo registrar la acción.' }, { status: 500 })
  }
}
