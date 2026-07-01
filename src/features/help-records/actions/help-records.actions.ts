'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCampaignAdminOrAdmin } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import type { ActionResult } from '@/shared/types/action-result'
import type { Database, HelpType } from '@/shared/types/database.types'
import { createHelpRecordsRepository } from '../repositories/help-records.repository'
import { helpRecordFormSchema, helpTypeCategoryCreateSchema } from '../schemas/help-records.schema'
import type { HelpRecordWithType } from '../types/help-records.types'

const idSchema = z.string().uuid()
type DBClient = Pick<SupabaseClient<Database>, 'from'>

function revalidateHelpRecords(caseId: string) {
  revalidatePath('/')
  revalidatePath(`/someone/${caseId}`)
  revalidatePath(`/dashboard/cases/${caseId}`)
}

async function writeHelpRecordLogs(
  client: DBClient,
  input: {
    action: 'created' | 'deleted'
    actorUserId: string
    caseId: string
    recordId: string
    values?: Record<string, unknown>
  },
) {
  const { error: auditError } = await client.from('audit_logs').insert({
    actor_user_id: input.actorUserId,
    entity_type: 'help_record',
    entity_id: input.recordId,
    action: input.action,
    new_values: input.values ?? null,
    metadata: { case_id: input.caseId },
  })
  if (auditError) console.error('[writeHelpRecordLogs - audit]', auditError)

  if (input.action === 'created') {
    const { error: webhookError } = await client.from('webhook_events').insert({
      event_type: 'help_record.created',
      payload: {
        case_id: input.caseId,
        help_record_id: input.recordId,
        ...input.values,
      },
      status: 'disabled',
    })
    if (webhookError) console.error('[writeHelpRecordLogs - webhook]', webhookError)
  }
}

export async function createHelpRecordAction(
  caseId: string,
  rawData: unknown,
): Promise<ActionResult<HelpRecordWithType>> {
  const { profile } = await requireCampaignAdminOrAdmin()
  const parsedCaseId = idSchema.safeParse(caseId)
  const parsed = helpRecordFormSchema.safeParse(rawData)

  if (!parsedCaseId.success || !parsed.success) {
    return {
      success: false,
      error: 'Datos del registro de ayuda inválidos.',
      fieldErrors: parsed.success
        ? undefined
        : (parsed.error.flatten().fieldErrors as Record<string, string[]>),
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const record = await createHelpRecordsRepository(client).create({
      caseId: parsedCaseId.data,
      helpTypeId: parsed.data.helpTypeId,
      createdByUserId: profile.id,
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      amountUsd: parsed.data.amountUsd,
      helpedAt: parsed.data.helpedAt,
      privateNotes: parsed.data.privateNotes || undefined,
      caseNeedIds: parsed.data.caseNeedIds,
    })
    const result = {
      ...record,
      createdBy: { fullName: profile.full_name, email: profile.email },
    }

    await writeHelpRecordLogs(client, {
      action: 'created',
      actorUserId: profile.id,
      caseId,
      recordId: record.id,
      values: {
        help_type_id: record.help_type_id,
        case_need_ids: record.caseNeedIds,
        amount_usd: record.amount_usd,
        helped_at: record.helped_at,
      },
    })
    revalidateHelpRecords(caseId)
    return { success: true, data: result }
  } catch (error) {
    console.error('[createHelpRecordAction]', error)
    return { success: false, error: 'No se pudo registrar la ayuda.' }
  }
}

export async function deleteHelpRecordAction(
  caseId: string,
  recordId: string,
): Promise<ActionResult<{ id: string }>> {
  const { profile } = await requireCampaignAdminOrAdmin()
  const parsed = z.object({ caseId: idSchema, recordId: idSchema }).safeParse({ caseId, recordId })
  if (!parsed.success) return { success: false, error: 'Identificador inválido.' }

  try {
    const client = await createServerSupabaseClient()
    await createHelpRecordsRepository(client).softDelete(parsed.data.caseId, parsed.data.recordId)
    await writeHelpRecordLogs(client, {
      action: 'deleted',
      actorUserId: profile.id,
      caseId,
      recordId,
    })
    revalidateHelpRecords(caseId)
    return { success: true, data: { id: recordId } }
  } catch (error) {
    console.error('[deleteHelpRecordAction]', error)
    return { success: false, error: 'No se pudo eliminar el registro de ayuda.' }
  }
}

export async function createHelpTypeAction(rawData: unknown): Promise<ActionResult<HelpType>> {
  const { profile } = await requireCampaignAdminOrAdmin()
  const parsed = helpTypeCategoryCreateSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Nombre de tipo de ayuda inválido.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const helpType = await createHelpRecordsRepository(client).createHelpType(
      parsed.data.name,
      profile.id,
    )
    return { success: true, data: helpType }
  } catch (error) {
    console.error('[createHelpTypeAction]', error)
    return { success: false, error: 'No se pudo crear el tipo de ayuda.' }
  }
}
