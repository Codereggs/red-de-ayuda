export const APP_NAME = 'Red de Ayuda'
export const PUBLIC_CODE_PREFIX = 'RA'
export const DEFAULT_COUNTRY = 'Venezuela'

export const CASE_TYPES = ['person', 'family'] as const
export const CASE_STATUSES = ['active', 'archived'] as const
export const PROFILE_ROLES = ['admin', 'helper'] as const
export const PROFILE_STATUSES = ['active', 'inactive'] as const

export const ASSISTANCE_METHOD_TYPES = [
  'bank_transfer',
  'pago_movil',
  'cash_contact',
  'physical_delivery',
] as const

export const ACCESS_LOG_ACTIONS = ['viewed', 'copied'] as const
export const WEBHOOK_STATUSES = ['pending', 'sent', 'failed', 'disabled'] as const

export const RATE_LIMIT = {
  REVEAL_PER_MINUTE: 10,
  REVEAL_PER_HOUR: 30,
} as const

export const RESPONSIBLE_USE_TEXT =
  'Usa estos datos con responsabilidad. Esta información se muestra únicamente para ayudar a una persona o familia verificada. No compartas estos datos fuera del contexto de ayuda y verifica cuidadosamente antes de transferir o entregar apoyo.'

export const CAMPAIGN_PUBLIC_CODE_PREFIX = 'CMP'
export const CAMPAIGN_STATUSES = ['collecting', 'purchasing', 'shipping', 'completed'] as const
export const CONTRIBUTION_STATUSES = ['pending', 'verified', 'rejected'] as const
export const CAMPAIGN_RECEIPTS_BUCKET = 'campaign-receipts'
export const CAMPAIGN_COVERS_BUCKET = 'campaign-covers'

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  collecting: 'Recolección',
  purchasing: 'Compra',
  shipping: 'Envío',
  completed: 'Finalizado',
}

export const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  verified: 'Verificado',
  rejected: 'Rechazado',
}
