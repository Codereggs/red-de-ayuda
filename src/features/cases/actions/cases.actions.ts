'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCasesRepository } from '../repositories/cases.repository'
import { createOrUpdateCaseSchema, archiveCaseSchema } from '../schemas/cases.schema'
import type { ActionResult } from '@/shared/types/action-result'

export async function createCaseAction(rawData: unknown): Promise<ActionResult<void>> {
  const { profile } = await requireAuth()

  const parsed = createOrUpdateCaseSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos del formulario inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { privateData, phones, ...caseFields } = parsed.data
  let caseId: string

  try {
    const client = await createServerSupabaseClient()
    const repo = createCasesRepository(client)
    const caseRow = await repo.create({
      ...caseFields,
      createdByUserId: profile.id,
      privateData: {
        idNumber: privateData.idNumber,
        birthDate: privateData.birthDate,
        previousFullAddress: privateData.previousFullAddress,
        currentFullAddress: privateData.currentFullAddress,
        verificationNotes: privateData.verificationNotes,
        privateNotes: privateData.privateNotes,
      },
      phones: phones.map((p) => ({ phone: p.phone, label: p.label, isPrimary: p.isPrimary })),
    })
    caseId = caseRow.id
  } catch {
    return { success: false, error: 'Error al crear el caso. Intenta de nuevo.' }
  }

  redirect(`/dashboard/cases/${caseId}`)
}

export async function updateCaseAction(
  caseId: string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  const { profile } = await requireAuth()

  const parsed = createOrUpdateCaseSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos del formulario inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { privateData, phones, ...caseFields } = parsed.data

  try {
    const client = await createServerSupabaseClient()
    const repo = createCasesRepository(client)
    await repo.update({
      caseId,
      updatedByUserId: profile.id,
      ...caseFields,
      privateData: {
        idNumber: privateData.idNumber,
        birthDate: privateData.birthDate,
        previousFullAddress: privateData.previousFullAddress,
        currentFullAddress: privateData.currentFullAddress,
        verificationNotes: privateData.verificationNotes,
        privateNotes: privateData.privateNotes,
      },
      phones: phones.map((p) => ({ phone: p.phone, label: p.label, isPrimary: p.isPrimary })),
    })
  } catch {
    return { success: false, error: 'Error al actualizar el caso. Intenta de nuevo.' }
  }

  redirect(`/dashboard/cases/${caseId}`)
}

export async function archiveCaseAction(
  caseId: string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  const { profile } = await requireAuth()

  const parsed = archiveCaseSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Motivo de archivo inválido.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCasesRepository(client)
    await repo.archive({
      caseId,
      archivedByUserId: profile.id,
      archiveReason: parsed.data.archiveReason,
    })
  } catch {
    return { success: false, error: 'Error al archivar el caso. Intenta de nuevo.' }
  }

  redirect('/dashboard/cases')
}
