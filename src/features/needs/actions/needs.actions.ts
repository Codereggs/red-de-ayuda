'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import type { ActionResult } from '@/shared/types/action-result'
import type { Database, NeedCategory } from '@/shared/types/database.types'
import { createNeedsRepository } from '../repositories/needs.repository'
import {
  needCategoryCreateSchema,
  needFormSchema,
  type NeedFormValues,
} from '../schemas/needs.schema'
import type { CaseNeedWithCategory } from '../types/needs.types'

const idSchema = z.string().uuid()
type DBClient = Pick<SupabaseClient<Database>, 'from'>

function revalidateNeeds(caseId: string) {
  revalidatePath('/')
  revalidatePath(`/someone/${caseId}`)
  revalidatePath(`/dashboard/cases/${caseId}`)
}

async function writeNeedAudit(
  client: DBClient,
  input: {
    action: 'created' | 'updated' | 'deleted'
    actorUserId: string
    caseId: string
    needId: string
    values?: Record<string, unknown>
  },
) {
  const { error: auditError } = await client.from('audit_logs').insert({
    actor_user_id: input.actorUserId,
    entity_type: 'case_need',
    entity_id: input.needId,
    action: input.action,
    new_values: input.values ?? null,
    metadata: { case_id: input.caseId },
  })
  if (auditError) console.error('[writeNeedAudit - audit]', auditError)

  if (input.action === 'created') {
    const { error: webhookError } = await client.from('webhook_events').insert({
      event_type: 'need.created',
      payload: {
        case_id: input.caseId,
        need_id: input.needId,
        ...input.values,
      },
      status: 'disabled',
    })
    if (webhookError) console.error('[writeNeedAudit - webhook]', webhookError)
  }
}

export async function createNeedAction(
  caseId: string,
  rawData: unknown,
): Promise<ActionResult<CaseNeedWithCategory>> {
  const { profile } = await requireAuth()
  const parsedCaseId = idSchema.safeParse(caseId)
  const parsed = needFormSchema.safeParse(rawData)

  if (!parsedCaseId.success || !parsed.success) {
    return {
      success: false,
      error: 'Datos de la necesidad inválidos.',
      fieldErrors: parsed.success
        ? undefined
        : (parsed.error.flatten().fieldErrors as Record<string, string[]>),
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const need = await createNeedsRepository(client).create({
      caseId: parsedCaseId.data,
      needCategoryId: parsed.data.needCategoryId,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit || undefined,
      comments: parsed.data.comments || undefined,
      createdByUserId: profile.id,
    })
    await writeNeedAudit(client, {
      action: 'created',
      actorUserId: profile.id,
      caseId,
      needId: need.id,
      values: {
        need_category_id: need.need_category_id,
        quantity: need.quantity,
        unit: need.unit,
        comments: need.comments,
      },
    })
    revalidateNeeds(caseId)
    return { success: true, data: need }
  } catch (error) {
    console.error('[createNeedAction]', error)
    return { success: false, error: 'No se pudo agregar la necesidad.' }
  }
}

export async function updateNeedAction(
  caseId: string,
  needId: string,
  rawData: unknown,
): Promise<ActionResult<CaseNeedWithCategory>> {
  const { profile } = await requireAuth()
  const parsedIds = z.object({ caseId: idSchema, needId: idSchema }).safeParse({ caseId, needId })
  const parsed = needFormSchema.safeParse(rawData)

  if (!parsedIds.success || !parsed.success) {
    return {
      success: false,
      error: 'Datos de la necesidad inválidos.',
      fieldErrors: parsed.success
        ? undefined
        : (parsed.error.flatten().fieldErrors as Record<string, string[]>),
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const need = await createNeedsRepository(client).update({
      caseId: parsedIds.data.caseId,
      needId: parsedIds.data.needId,
      needCategoryId: parsed.data.needCategoryId,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit || null,
      comments: parsed.data.comments || null,
    })
    await writeNeedAudit(client, {
      action: 'updated',
      actorUserId: profile.id,
      caseId,
      needId: need.id,
      values: {
        need_category_id: need.need_category_id,
        quantity: need.quantity,
        unit: need.unit,
        comments: need.comments,
      },
    })
    revalidateNeeds(caseId)
    return { success: true, data: need }
  } catch (error) {
    console.error('[updateNeedAction]', error)
    return { success: false, error: 'No se pudo actualizar la necesidad.' }
  }
}

export async function deleteNeedAction(
  caseId: string,
  needId: string,
): Promise<ActionResult<{ id: string }>> {
  const { profile } = await requireAuth()
  const parsed = z.object({ caseId: idSchema, needId: idSchema }).safeParse({ caseId, needId })
  if (!parsed.success) return { success: false, error: 'Identificador inválido.' }

  try {
    const client = await createServerSupabaseClient()
    await createNeedsRepository(client).softDelete(parsed.data.caseId, parsed.data.needId)
    await writeNeedAudit(client, {
      action: 'deleted',
      actorUserId: profile.id,
      caseId,
      needId,
    })
    revalidateNeeds(caseId)
    return { success: true, data: { id: parsed.data.needId } }
  } catch (error) {
    console.error('[deleteNeedAction]', error)
    return { success: false, error: 'No se pudo eliminar la necesidad.' }
  }
}

export async function createNeedCategoryAction(
  rawData: unknown,
): Promise<ActionResult<NeedCategory>> {
  const { profile } = await requireAuth()
  const parsed = needCategoryCreateSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Nombre de categoría inválido.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const category = await createNeedsRepository(client).createCategory(
      parsed.data.name,
      profile.id,
    )
    return { success: true, data: category }
  } catch (error) {
    console.error('[createNeedCategoryAction]', error)
    return { success: false, error: 'No se pudo crear la categoría.' }
  }
}

export type { NeedFormValues }
