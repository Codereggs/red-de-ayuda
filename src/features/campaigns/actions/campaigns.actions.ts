'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAuth, requireAdmin, requireCampaignAdminOrAdmin } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCampaignsRepository } from '../repositories/campaigns.repository'
import {
  campaignFormSchema,
  campaignStatusSchema,
  archiveCampaignSchema,
  campaignMemberSchema,
  contributionFormSchema,
  campaignAssistanceMethodSchema,
  bulkMemberJsonSchema,
} from '../schemas/campaigns.schema'
import type { ActionResult } from '@/shared/types/action-result'
import type { Campaign, CampaignAssistanceMethod, CampaignContribution } from '@/shared/types/database.types'
import type { CampaignImage } from '../types/campaigns.types'

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
    const helperContactUrl = parsed.data.helperContactUrl?.trim() || null
    const campaign = await repo.create({
      title: parsed.data.title,
      description: parsed.data.description,
      goalAmountUsd: parsed.data.goalAmountUsd,
      helperContactUrl,
      // El párrafo solo se guarda si hay link.
      helperContactNote: helperContactUrl ? parsed.data.helperContactNote?.trim() || null : null,
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
    const helperContactUrl = parsed.data.helperContactUrl?.trim() || null
    await repo.update({
      campaignId,
      title: parsed.data.title,
      description: parsed.data.description,
      goalAmountUsd: parsed.data.goalAmountUsd,
      helperContactUrl,
      helperContactNote: helperContactUrl ? parsed.data.helperContactNote?.trim() || null : null,
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

// ── Bulk import ───────────────────────────────────────────────────────────

export async function bulkAddCampaignMembersAction(
  campaignId: string,
  rawJson: unknown,
): Promise<ActionResult<{ added: number; newCategories: number }>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  const parsedId = idSchema.safeParse(campaignId)
  if (!parsedId.success) return { success: false, error: 'ID de campaña inválido.' }

  const parsed = bulkMemberJsonSchema.safeParse(rawJson)
  if (!parsed.success) {
    return { success: false, error: `JSON inválido: ${parsed.error.issues[0]?.message ?? 'formato incorrecto'}` }
  }

  if (parsed.data.length === 0) return { success: false, error: 'El JSON no contiene miembros.' }

  // Collect unique category names before calling repo (to report newCategories count)
  const buildCategoryName = (medicine: string, dose: string) =>
    dose.trim() ? `${medicine.trim()} ${dose.trim()}` : medicine.trim()

  // Load existing categories to count how many will be created
  const client = await createServerSupabaseClient()
  const { data: existingCatsRaw } = await client
    .from('need_categories')
    .select('name')
    .is('deleted_at', null)

  const existingCats = existingCatsRaw as { name: string }[] | null
  const existingNorm = new Set((existingCats ?? []).map((c) => c.name.trim().toLowerCase()))
  const neededNames = [
    ...new Set(
      parsed.data.flatMap((m) =>
        m.needs.map((n) => buildCategoryName(n.medicine, n.dose)),
      ),
    ),
  ]
  const newCategoriesCount = neededNames.filter((n) => !existingNorm.has(n.toLowerCase())).length

  try {
    const repo = createCampaignsRepository(client)
    const { added } = await repo.bulkAddMembers({
      campaignId,
      createdByUserId: profile.id,
      members: parsed.data.map((m) => ({
        fullName: m.name,
        idNumber: m.document != null ? String(m.document) : undefined,
        needs: m.needs.map((n) => ({
          categoryName: buildCategoryName(n.medicine, n.dose),
          priceUsd: n.price ?? 0,
        })),
      })),
    })
    revalidateCampaign(campaignId)
    return { success: true, data: { added, newCategories: newCategoriesCount } }
  } catch (err) {
    console.error('[bulkAddCampaignMembersAction]', err)
    return { success: false, error: 'Error en la importación. Intenta de nuevo.' }
  }
}

// ── Images ─────────────────────────────────────────────────────────────────

export async function addCampaignImagesAction(
  campaignId: string,
  paths: unknown,
): Promise<ActionResult<{ images: CampaignImage[] }>> {
  const { profile } = await requireCampaignAdminOrAdmin()

  const parsedId = idSchema.safeParse(campaignId)
  const parsedPaths = z.array(z.string().min(1)).max(30).safeParse(paths)
  if (!parsedId.success || !parsedPaths.success) {
    return { success: false, error: 'Datos de imágenes inválidos.' }
  }
  if (parsedPaths.data.length === 0) return { success: false, error: 'No hay imágenes para agregar.' }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const images = await repo.addCampaignImages(campaignId, parsedPaths.data, profile.id)
    revalidateCampaign(campaignId)
    return { success: true, data: { images } }
  } catch (err) {
    console.error('[addCampaignImagesAction]', err)
    return { success: false, error: 'Error al guardar imágenes. Intenta de nuevo.' }
  }
}

export async function deleteCampaignImageAction(
  campaignId: string,
  imageId: string,
): Promise<ActionResult<void>> {
  await requireCampaignAdminOrAdmin()

  const parsedId = idSchema.safeParse(campaignId)
  const parsedImageId = idSchema.safeParse(imageId)
  if (!parsedId.success || !parsedImageId.success) {
    return { success: false, error: 'Identificador inválido.' }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const storagePath = await repo.deleteCampaignImage(campaignId, imageId)
    // Borrar el objeto en Storage para no dejar basura.
    const { deleteCampaignImageObject } = await import('@/shared/lib/supabase/storage')
    await deleteCampaignImageObject(storagePath)
    revalidateCampaign(campaignId)
    return { success: true, data: undefined }
  } catch (err) {
    console.error('[deleteCampaignImageAction]', err)
    return { success: false, error: 'Error al eliminar la imagen. Intenta de nuevo.' }
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

export async function updateCampaignMemberAction(
  campaignId: string,
  caseId: string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  await requireCampaignAdminOrAdmin()

  const parsedId = idSchema.safeParse(campaignId)
  const parsedCaseId = idSchema.safeParse(caseId)
  const parsed = campaignMemberSchema.safeParse(rawData)

  if (!parsedId.success || !parsedCaseId.success || !parsed.success) {
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
    await repo.updateMember({
      campaignId,
      caseId,
      fullName: parsed.data.fullName,
      idNumber: parsed.data.idNumber,
      privateNotes: parsed.data.privateNotes,
      needs: parsed.data.needs,
    })
    revalidateCampaign(campaignId)
    return { success: true, data: undefined }
  } catch (err) {
    console.error('[updateCampaignMemberAction]', err)
    return { success: false, error: 'Error al actualizar el miembro. Intenta de nuevo.' }
  }
}

export async function getCampaignMemberDetailAction(
  campaignId: string,
  caseId: string,
): Promise<ActionResult<{ idNumber: string | null; privateNotes: string | null }>> {
  // Lectura: helpers también pueden ver el detalle del miembro (no editan).
  await requireAuth()

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const detail = await repo.getMemberDetail(campaignId, caseId)
    return { success: true, data: { idNumber: detail.idNumber, privateNotes: detail.privateNotes } }
  } catch {
    return { success: false, error: 'Error al cargar el detalle del miembro.' }
  }
}

export async function deleteAllCampaignMembersAction(
  campaignId: string,
  confirmation: string,
): Promise<ActionResult<{ deleted: number }>> {
  // Borrado total y destructivo → solo admin.
  await requireAdmin()

  const parsedId = idSchema.safeParse(campaignId)
  if (!parsedId.success) return { success: false, error: 'ID de campaña inválido.' }
  if (confirmation !== 'CONFIRMAR') {
    return { success: false, error: 'Debes escribir CONFIRMAR para proceder.' }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const result = await repo.deleteAllMembers(campaignId)
    revalidateCampaign(campaignId)
    return { success: true, data: result }
  } catch (err) {
    console.error('[deleteAllCampaignMembersAction]', err)
    return { success: false, error: 'Error al borrar los miembros. Intenta de nuevo.' }
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
    // Solo puede existir un método principal por campaña.
    if (parsed.data.isPrimary) await repo.clearPrimaryFlag(campaignId)
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
      documentType: parsed.data.documentType,
      addressCountry: parsed.data.addressCountry,
      addressState: parsed.data.addressState,
      addressCity: parsed.data.addressCity,
      addressLine: parsed.data.addressLine,
      purpose: parsed.data.purpose,
    })
    revalidatePath(`/dashboard/campaigns/${campaignId}`)
    return { success: true, data: method }
  } catch (err) {
    console.error('[createAssistanceMethodAction]', err)
    return { success: false, error: 'Error al crear el método de pago. Intenta de nuevo.' }
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
    // Solo puede existir un método principal por campaña.
    if (parsed.data.isPrimary) await repo.clearPrimaryFlag(campaignId, methodId)
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
      documentType: parsed.data.documentType,
      addressCountry: parsed.data.addressCountry,
      addressState: parsed.data.addressState,
      addressCity: parsed.data.addressCity,
      addressLine: parsed.data.addressLine,
      purpose: parsed.data.purpose,
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

  const parsedPath = z.string().min(1).max(300).safeParse(receiptImagePath)
  if (!parsedPath.success) {
    return { success: false, error: 'Ruta de comprobante inválida.' }
  }

  try {
    const client = await createServerSupabaseClient()
    const repo = createCampaignsRepository(client)
    const exists = await repo.receiptPathExists(parsedPath.data)
    if (!exists) {
      return { success: false, error: 'Comprobante no encontrado.' }
    }

    const { getCampaignReceiptSignedUrl } = await import('@/shared/lib/supabase/storage')
    const url = await getCampaignReceiptSignedUrl(parsedPath.data)
    return { success: true, data: { url } }
  } catch {
    return { success: false, error: 'Error al obtener el comprobante.' }
  }
}
