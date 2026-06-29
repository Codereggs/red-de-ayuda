import { z } from 'zod'

export const needFormSchema = z.object({
  needCategoryId: z.string().uuid('Selecciona una categoría'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit: z.string().trim().max(50).optional(),
  comments: z.string().trim().max(500).optional(),
})

export const needCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Escribe al menos 2 caracteres').max(200),
})

export type NeedFormValues = z.infer<typeof needFormSchema>
export type NeedCategoryCreateValues = z.infer<typeof needCategoryCreateSchema>
