import { z } from 'zod'

export const helpRecordFormSchema = z.object({
  helpTypeId: z.string().uuid(),
  caseNeedIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos una necesidad'),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  amountUsd: z.number().nonnegative().optional(),
  helpedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  privateNotes: z.string().max(1000).optional(),
})

export const helpTypeCategoryCreateSchema = z.object({
  name: z.string().min(2).max(200),
})

export type HelpRecordFormValues = z.infer<typeof helpRecordFormSchema>
export type HelpTypeCategoryCreateValues = z.infer<typeof helpTypeCategoryCreateSchema>
