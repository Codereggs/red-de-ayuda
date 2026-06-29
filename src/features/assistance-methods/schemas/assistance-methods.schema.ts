import { z } from 'zod'
import { ASSISTANCE_METHOD_TYPES } from '@/shared/constants'

export const assistanceMethodTypeSchema = z.enum(ASSISTANCE_METHOD_TYPES)

export const assistanceMethodFormSchema = z
  .object({
    type: assistanceMethodTypeSchema,
    label: z.string().min(2).max(200),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true),
    holderFullName: z.string().min(2).max(200),
    idNumber: z.string().min(1).max(50),
    phone: z.string().regex(/^0\d{10}$/, 'Formato venezolano requerido'),
    bankName: z.string().max(200).optional(),
    accountNumber: z.string().max(100).optional(),
    accountType: z.string().max(100).optional(),
    previousFullAddress: z.string().min(5).max(500),
    currentFullAddress: z.string().min(5).max(500),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'bank_transfer' || data.type === 'pago_movil') {
      if (!data.bankName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido para este tipo', path: ['bankName'] })
      }
    }
    if (data.type === 'bank_transfer') {
      if (!data.accountNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido para transferencia', path: ['accountNumber'] })
      }
      if (!data.accountType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido para transferencia', path: ['accountType'] })
      }
    }
  })

export type AssistanceMethodFormValues = z.infer<typeof assistanceMethodFormSchema>
