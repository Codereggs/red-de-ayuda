import type { CampaignAssistanceMethod } from '@/shared/types/database.types'

export const TYPE_LABELS: Record<string, string> = {
  bank_transfer: 'Transferencia bancaria',
  pago_movil: 'Pago Móvil',
  cash_contact: 'Efectivo / contacto',
  physical_delivery: 'Entrega física',
}

export const COUNTRY_OPTIONS = [
  { code: 'VE', label: 'Venezuela', flag: '🇻🇪' },
  { code: 'AR', label: 'Argentina', flag: '🇦🇷' },
  { code: 'US', label: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'ES', label: 'España', flag: '🇪🇸' },
  { code: 'CO', label: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', label: 'México', flag: '🇲🇽' },
  { code: 'CL', label: 'Chile', flag: '🇨🇱' },
  { code: 'PE', label: 'Perú', flag: '🇵🇪' },
]

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'V', label: 'V - Venezolano' },
  { value: 'E', label: 'E - Extranjero' },
  { value: 'J', label: 'J - Jurídico (RIF)' },
  { value: 'P', label: 'P - Pasaporte' },
  { value: 'G', label: 'G - Gubernamental' },
]

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'corriente', label: 'Corriente' },
]

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

export function countryLabel(code: string): string {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.label ?? code
}

export function countryFlag(code: string): string {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.flag ?? '🌐'
}

export function accountTypeLabel(value: string | null): string | null {
  if (!value) return null
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function documentLabel(m: Pick<CampaignAssistanceMethod, 'document_type' | 'id_number'>): string | null {
  if (!m.id_number) return null
  // Formato venezolano sin separador: "V26610192".
  return m.document_type ? `${m.document_type}${m.id_number}` : m.id_number
}

export function fullAddress(
  m: Pick<CampaignAssistanceMethod, 'address_line' | 'address_city' | 'address_state' | 'address_country'>,
): string | null {
  const parts = [m.address_line, m.address_city, m.address_state, m.address_country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

/** Short contact hint for the card summary: account number, phone, or alias. */
export function contactHint(m: CampaignAssistanceMethod): string | null {
  if (m.account_number) return m.account_number
  if (m.phone) return m.phone
  if (m.alias) return `Alias: ${m.alias}`
  return null
}

/** Count how many detail fields exist beyond the card summary (drives "click para más"). */
export function detailFieldCount(m: CampaignAssistanceMethod): number {
  const fields = [
    m.holder_full_name,
    documentLabel(m),
    m.phone,
    m.bank_name,
    m.account_number,
    accountTypeLabel(m.account_type),
    m.alias,
    fullAddress(m),
    m.purpose,
    m.notes,
  ]
  return fields.filter(Boolean).length
}
