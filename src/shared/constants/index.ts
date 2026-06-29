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
