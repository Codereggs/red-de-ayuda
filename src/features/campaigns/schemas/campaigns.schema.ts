import { z } from 'zod'
import { ASSISTANCE_METHOD_TYPES, CAMPAIGN_STATUSES } from '@/shared/constants'

export const campaignFormSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').max(200),
  description: z.string().max(2000).optional(),
  goalAmountUsd: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('La meta debe ser mayor a 0'),
})

export const campaignStatusSchema = z.object({
  status: z.enum(CAMPAIGN_STATUSES),
})

export const archiveCampaignSchema = z.object({
  archiveReason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})

export const campaignMemberNeedSchema = z.object({
  needCategoryId: z.string().uuid('Selecciona una necesidad válida'),
  priceUsd: z
    .number({ invalid_type_error: 'Ingresa un precio válido' })
    .min(0, 'El precio no puede ser negativo'),
})

export const campaignMemberSchema = z.object({
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre es demasiado largo'),
  idNumber: z.string().max(50).optional(),
  privateNotes: z.string().max(1000).optional(),
  needs: z
    .array(campaignMemberNeedSchema)
    .min(1, 'Se requiere al menos una necesidad por miembro'),
})

export const contributionFormSchema = z.object({
  amountUsd: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0'),
  contributorName: z.string().max(200).optional(),
  reference: z.string().max(200).optional(),
  transferredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  notes: z.string().max(1000).optional(),
  receiptImagePath: z.string().optional(),
})

export const campaignAssistanceMethodSchema = z
  .object({
    countryCode: z.string().length(2).default('VE'),
    type: z.enum(ASSISTANCE_METHOD_TYPES),
    label: z.string().min(1, 'El nombre es requerido').max(200),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true),
    holderFullName: z.string().min(1, 'El titular es requerido').max(200),
    idNumber: z.string().max(50).optional(),
    phone: z.string().max(30).optional(),
    bankName: z.string().max(200).optional(),
    accountNumber: z.string().max(50).optional(),
    accountType: z.string().max(100).optional(),
    alias: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    // Datos para transferencia internacional a Venezuela (Brubank AR → VE)
    documentType: z.string().max(50).optional(),
    addressCountry: z.string().max(100).optional(),
    addressState: z.string().max(100).optional(),
    addressCity: z.string().max(100).optional(),
    addressLine: z.string().max(300).optional(),
    purpose: z.string().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    // Para transferencias bancarias a Venezuela, los datos de transferencia
    // internacional son obligatorios (los exige la banca de origen, ej. Brubank).
    if (data.countryCode !== 'VE' || data.type !== 'bank_transfer') return
    const required: [keyof typeof data, string][] = [
      ['documentType', 'El tipo de documento es requerido'],
      ['idNumber', 'El número de documento es requerido'],
      ['bankName', 'El banco es requerido'],
      ['accountType', 'El tipo de cuenta es requerido'],
      ['accountNumber', 'El número de cuenta es requerido'],
      ['phone', 'El teléfono es requerido'],
      ['addressCountry', 'El país de dirección es requerido'],
      ['addressState', 'La provincia/estado es requerido'],
      ['addressCity', 'La ciudad es requerida'],
      ['addressLine', 'La dirección es requerida'],
      ['purpose', 'El propósito es requerido'],
    ]
    for (const [field, message] of required) {
      const value = data[field]
      if (typeof value !== 'string' || value.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
      }
    }
  })

export const bulkMemberNeedJsonSchema = z.object({
  medicine: z.string().min(1),
  dose: z.string().default(''),
  price: z.number().nullable().optional(),
})

export const bulkMemberJsonSchema = z.array(
  z.object({
    name: z.string().min(1, 'Nombre requerido'),
    document: z.union([z.string(), z.number()]).optional().nullable(),
    needs: z.array(bulkMemberNeedJsonSchema).default([]),
  }),
)

export type BulkMemberJson = z.infer<typeof bulkMemberJsonSchema>
export type BulkMemberNeedJson = z.infer<typeof bulkMemberNeedJsonSchema>

export type CampaignFormValues = z.infer<typeof campaignFormSchema>
export type CampaignStatusValues = z.infer<typeof campaignStatusSchema>
export type ArchiveCampaignValues = z.infer<typeof archiveCampaignSchema>
export type CampaignMemberValues = z.infer<typeof campaignMemberSchema>
export type ContributionFormValues = z.infer<typeof contributionFormSchema>
export type CampaignAssistanceMethodValues = z.infer<typeof campaignAssistanceMethodSchema>
