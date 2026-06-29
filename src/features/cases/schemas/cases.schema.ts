import { z } from 'zod'
import { CASE_TYPES } from '@/shared/constants'

export const caseTypeSchema = z.enum(CASE_TYPES)

export const caseFormSchema = z.object({
  caseType: caseTypeSchema,
  fullName: z.string().min(2).max(200),
  situationCategoryId: z.string().uuid(),
  publicContactPlace: z.string().min(2).max(500),
  country: z.string().min(1).max(100).default('Venezuela'),
  state: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  publicNotes: z.string().max(1000).optional(),
})

export const casePrivateDataSchema = z.object({
  idNumber: z.string().min(1).max(50),
  birthDate: z.string().optional(),
  previousFullAddress: z.string().min(5).max(500),
  currentFullAddress: z.string().min(5).max(500),
  verificationNotes: z.string().min(5).max(1000),
  privateNotes: z.string().max(1000).optional(),
})

export const casePhoneSchema = z.object({
  phone: z.string().regex(/^0\d{10}$/, 'Formato venezolano requerido: 04XX-XXXXXXX'),
  label: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
})

export const archiveCaseSchema = z.object({
  archiveReason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})

export const createOrUpdateCaseSchema = caseFormSchema.extend({
  privateData: casePrivateDataSchema,
  phones: z.array(casePhoneSchema).min(1, 'Se requiere al menos un teléfono de contacto'),
})

export type CaseFormValues = z.infer<typeof caseFormSchema>
export type CasePrivateDataValues = z.infer<typeof casePrivateDataSchema>
export type CasePhoneValues = z.infer<typeof casePhoneSchema>
export type ArchiveCaseValues = z.infer<typeof archiveCaseSchema>
export type CreateOrUpdateCaseValues = z.infer<typeof createOrUpdateCaseSchema>
