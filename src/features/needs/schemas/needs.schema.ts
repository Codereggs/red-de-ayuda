import { z } from 'zod'

export const needFormSchema = z.object({
  needCategoryId: z.string().uuid(),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit: z.string().max(50).optional(),
  comments: z.string().max(500).optional(),
})

export const needCategoryCreateSchema = z.object({
  name: z.string().min(2).max(200),
})

export type NeedFormValues = z.infer<typeof needFormSchema>
export type NeedCategoryCreateValues = z.infer<typeof needCategoryCreateSchema>
