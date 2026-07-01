'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAuth, requireCampaignAdminOrAdmin } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCampaignsRepository } from '../repositories/campaigns.repository'
import {
  campaignFormSchema,
  campaignStatusSchema,
  archiveCampaignSchema,
  campaignMemberSchema,
  contributionFormSchema,
  campaignAssistanceMethodSchema,
} from '../schemas/campaigns.schema'
import type { ActionResult } from '@/shared/types/action-result'
import type { Campaign, CampaignAssistanceMethod, CampaignContribution } from '@/shared/types/database.types'

const idSchema = z.string().uuid()

function revalidateCampaign(id: string) {
  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${id}`)
  revalidatePath('/dashboard/campaigns')
  revalidatePath(`/dashboard/campaigns/${id}`)
}

// ── Campaign CRUD ──────────────────────────────────────────────────────────

export async function createCampaignAction(rawData: unknown): Promise<ActionResult<void>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  const parsed = campaignFormSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos del formulario inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  let campaignId: string
  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const campaign = await repo.create({
      title: parsed.data.title,
      description: parsed.data.description,
      goalAmountUsd: parsed.data.goalAmountUsd,
      createdByUserId: profile.id,
    })
    campaignId = campaign.id
  } catch {
    return { success: false, error: 'Error al crear la campaña. Intenta de nuevo.' }
  }

  redirect(`/dashboard/campaigns/${campaignId}`)
}

export async function updateCampaignAction(
  campaignId: string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  const parsed = campaignFormSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos del formulario inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.update({
      campaignId,
      title: parsed.data.title,
      description: parsed.data.description,
      goalAmountUsd: parsed.data.goalAmountUsd,
      updatedByUserId: profile.id,
    })
  } catch {
    return { success: false, error: 'Error al actualizar la campaña. Intenta de nuevo.' }
  }

  redirect(`/dashboard/campaigns/${campaignId}`)
}

export async function archiveCampaignAction(
  campaignId: string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  const parsed = archiveCampaignSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Motivo de archivo inválido.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.archive({
      campaignId,
      archiveReason: parsed.data.archiveReason,
      archivedByUserId: profile.id,
    })
  } catch {
    return { success: false, error: 'Error al archivar la campaña. Intenta de nuevo.' }
  }

  redirect('/dashboard/campaigns')
}

export async function updateCampaignStatusAction(
  campaignId: string,
  rawData: unknown,
): Promise<ActionResult<Campaign>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  const parsed = campaignStatusSchema.safeParse(rawData)
  if (!parsed.success) {
    return { success: false, error: 'Estado inválido.' }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.updateStatus(campaignId, parsed.data.status, profile.id)
    const updated = await repo.findPrivateById(campaignId)
    if (!updated) return { success: false, error: 'Campaña no encontrada.' }
    revalidateCampaign(campaignId)
    return { success: true, data: updated }
  } catch {
    return { success: false, error: 'Error al cambiar el estado. Intenta de nuevo.' }
  }
}

// ── Members ────────────────────────────────────────────────────────────────

export async function addCampaignMemberAction(
  campaignId: string,
  rawData: unknown,
): Promise<ActionResult<{ caseId: string }>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  const parsedId = idSchema.safeParse(campaignId)
  const parsed = campaignMemberSchema.safeParse(rawData)

  if (!parsedId.success || !parsed.success) {
    return {
      success: false,
      error: 'Datos del miembro inválidos.',
      fieldErrors: parsed.success
        ? undefined
        : (parsed.error.flatten().fieldErrors as Record<string, string[]>),
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const caseId = await repo.addMember({
      campaignId,
      fullName: parsed.data.fullName,
      idNumber: parsed.data.idNumber,
      privateNotes: parsed.data.privateNotes,
      createdByUserId: profile.id,
      needs: parsed.data.needs,
    })
    revalidateCampaign(campaignId)
    return { success: true, data: { caseId } }
  } catch {
    return { success: false, error: 'Error al agregar el miembro. Intenta de nuevo.' }
  }
}

export async function removeCampaignMemberAction(
  campaignId: string,
  caseId: string,
): Promise<ActionResult<void>> {
  await requireCampaignAdminOrAdmin()

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.removeMember(campaignId, caseId)
    revalidateCampaign(campaignId)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al eliminar el miembro. Intenta de nuevo.' }
  }
}

export async function toggleNeedPurchasedAction(
  needId: string,
  campaignId: string,
  purchased: boolean,
): Promise<ActionResult<{ purchased_at: string | null }>> {
  await requireCampaignAdminOrAdmin()

  const parsedNeedId = idSchema.safeParse(needId)
  if (!parsedNeedId.success) return { success: false, error: 'ID de necesidad inválido.' }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const purchased_at = await repo.toggleNeedPurchased(needId, purchased)
    revalidateCampaign(campaignId)
    return { success: true, data: { purchased_at } }
  } catch {
    return { success: false, error: 'Error al actualizar la necesidad.' }
  }
}

// ── Contributions ──────────────────────────────────────────────────────────

export async function createContributionAction(
  campaignId: string,
  rawData: unknown,
): Promise<ActionResult<CampaignContribution>> {
  const { profile } = await requireAuth()

  const parsed = contributionFormSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos del aporte inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const contribution = await repo.createContribution({
      campaignId,
      amountUsd: parsed.data.amountUsd,
      contributorName: parsed.data.contributorName,
      reference: parsed.data.reference,
      receiptImagePath: parsed.data.receiptImagePath ?? null,
      transferredAt: parsed.data.transferredAt,
      notes: parsed.data.notes,
      createdByUserId: profile.id,
    })
    revalidateCampaign(campaignId)
    return { success: true, data: contribution }
  } catch {
    return { success: false, error: 'Error al registrar el aporte. Intenta de nuevo.' }
  }
}

export async function verifyContributionAction(
  campaignId: string,
  contributionId: string,
): Promise<ActionResult<void>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.verifyContribution(contributionId, profile.id)
    revalidateCampaign(campaignId)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al verificar el aporte.' }
  }
}

export async function rejectContributionAction(
  campaignId: string,
  contributionId: string,
): Promise<ActionResult<void>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.rejectContribution(contributionId, profile.id)
    revalidateCampaign(campaignId)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al rechazar el aporte.' }
  }
}

export async function deleteContributionAction(
  campaignId: string,
  contributionId: string,
): Promise<ActionResult<void>> {
  await requireCampaignAdminOrAdmin()

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.softDeleteContribution(contributionId)
    revalidateCampaign(campaignId)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al eliminar el aporte.' }
  }
}

// ── Assistance methods ─────────────────────────────────────────────────────

export async function createAssistanceMethodAction(
  campaignId: string,
  rawData: unknown,
): Promise<ActionResult<CampaignAssistanceMethod>> {
  await requireCampaignAdminOrAdmin()

  const parsed = campaignAssistanceMethodSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos del método de pago inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const method = await repo.createAssistanceMethod({
      campaignId,
      countryCode: parsed.data.countryCode,
      type: parsed.data.type,
      label: parsed.data.label,
      isPrimary: parsed.data.isPrimary,
      isActive: parsed.data.isActive,
      holderFullName: parsed.data.holderFullName,
      idNumber: parsed.data.idNumber,
      phone: parsed.data.phone,
      bankName: parsed.data.bankName,
      accountNumber: parsed.data.accountNumber,
      accountType: parsed.data.accountType,
      alias: parsed.data.alias,
      notes: parsed.data.notes,
    })
    revalidatePath(`/dashboard/campaigns/${campaignId}`)
    return { success: true, data: method }
  } catch {
    return { success: false, error: 'Error al crear el método de pago.' }
  }
}

export async function updateAssistanceMethodAction(
  campaignId: string,
  methodId: string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  await requireCampaignAdminOrAdmin()

  const parsed = campaignAssistanceMethodSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos del método de pago inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.updateAssistanceMethod({
      methodId,
      countryCode: parsed.data.countryCode,
      type: parsed.data.type,
      label: parsed.data.label,
      isPrimary: parsed.data.isPrimary,
      isActive: parsed.data.isActive,
      holderFullName: parsed.data.holderFullName,
      idNumber: parsed.data.idNumber,
      phone: parsed.data.phone,
      bankName: parsed.data.bankName,
      accountNumber: parsed.data.accountNumber,
      accountType: parsed.data.accountType,
      alias: parsed.data.alias,
      notes: parsed.data.notes,
    })
    revalidatePath(`/dashboard/campaigns/${campaignId}`)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al actualizar el método de pago.' }
  }
}

export async function deleteAssistanceMethodAction(
  campaignId: string,
  methodId: string,
): Promise<ActionResult<void>> {
  await requireCampaignAdminOrAdmin()

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    await repo.softDeleteAssistanceMethod(methodId)
    revalidatePath(`/dashboard/campaigns/${campaignId}`)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al eliminar el método de pago.' }
  }
}

export async function getReceiptSignedUrlAction(
  receiptImagePath: string,
): Promise<ActionResult<{ url: string }>> {
  await requireAuth()

  try {
    const { getCampaignReceiptSignedUrl } = await import('@/shared/lib/supabase/storage')
    const url = await getCampaignReceiptSignedUrl(receiptImagePath)
    return { success: true, data: { url } }
  } catch {
    return { success: false, error: 'Error al obtener el comprobante.' }
  }
}
