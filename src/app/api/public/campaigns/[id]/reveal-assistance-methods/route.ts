import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession, isActiveHelperOrAdmin } from '@/shared/lib/auth/get-session'
import { createServiceSupabaseClient } from '@/shared/lib/supabase/server'
import type { Database } from '@/shared/types/database.types'
import { createCampaignsRepository } from '@/features/campaigns/repositories/campaigns.repository'
import { checkRevealRateLimit, hashIp } from '@/shared/lib/rate-limit'

type AccessLogInsert =
  Database['public']['Tables']['campaign_assistance_method_access_logs']['Insert']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params

  if (!z.string().uuid().safeParse(campaignId).success) {
    return Response.json({ error: 'Identificador de campaña inválido.' }, { status: 400 })
  }

  try {
    const session = await getSession()
    if (!isActiveHelperOrAdmin(session)) {
      return Response.json(
        { error: 'Debes iniciar sesión como helper para ver los datos de pago.' },
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
    const repo = createCampaignsRepository(serviceClient)

    const publicCampaign = await repo.findPublicById(campaignId)
    if (!publicCampaign) {
      return Response.json({ error: 'Campaña no encontrada.' }, { status: 404 })
    }

    // Meta alcanzada → ya no se muestran los métodos de pago.
    if (
      publicCampaign.goal_amount_usd > 0 &&
      publicCampaign.raised_amount_usd >= publicCampaign.goal_amount_usd
    ) {
      return Response.json(
        { error: 'Esta campaña ya alcanzó su meta. ¡Gracias! Apoya otra campaña activa.' },
        { status: 409 },
      )
    }

    const assistanceMethods = await repo.revealAssistanceMethods(campaignId)

    const logs: AccessLogInsert[] =
      assistanceMethods.length > 0
        ? assistanceMethods.map((method) => ({
            campaign_id: campaignId,
            campaign_assistance_method_id: method.id,
            action: 'viewed' as const,
            ip_hash: ipHash,
            user_agent: req.headers.get('user-agent') ?? '',
          }))
        : [
            {
              campaign_id: campaignId,
              campaign_assistance_method_id: null,
              action: 'viewed' as const,
              ip_hash: ipHash,
              user_agent: req.headers.get('user-agent') ?? '',
            },
          ]

    const { error: logError } = await serviceClient
      .from('campaign_assistance_method_access_logs')
      .insert(logs)
    if (logError) throw new Error(`[reveal-campaign-methods - log] ${logError.message}`)

    return Response.json({ assistanceMethods })
  } catch (err) {
    console.error('[reveal-campaign-assistance-methods]', err)
    return Response.json({ error: 'Error al obtener los datos de pago.' }, { status: 500 })
  }
}
