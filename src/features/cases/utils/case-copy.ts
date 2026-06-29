import type { AssistanceMethod } from '@/shared/types/database.types'
import type { PublicCase } from '../types/cases.types'

function caseHeader(caseData: PublicCase): string[] {
  return [
    'Caso verificado en Red de Ayuda',
    '',
    `Código: ${caseData.public_code}`,
    `Nombre: ${caseData.full_name}`,
    `Situación: ${caseData.situation.name}`,
    `Ubicación: ${caseData.city}, ${caseData.state}, ${caseData.country}`,
    '',
    'Necesidades:',
    ...(caseData.needs.length > 0
      ? caseData.needs.map(
          (need) =>
            `- ${need.category.name} — Cantidad: ${need.quantity}${need.unit ? ` ${need.unit}` : ''}`,
        )
      : ['- Sin necesidades publicadas']),
  ]
}

export function buildPublicCaseCopy(caseData: PublicCase, origin: string): string {
  const lastHelp = caseData.last_helped_at
    ? new Date(`${caseData.last_helped_at}T00:00:00`).toLocaleDateString('es-VE')
    : 'Sin ayudas todavía'

  return [
    ...caseHeader(caseData),
    '',
    `Última ayuda registrada: ${lastHelp}`,
    '',
    'Ficha:',
    `${origin}/someone/${caseData.id}`,
  ].join('\n')
}

export function buildAssistanceMethodCopy(caseData: PublicCase, method: AssistanceMethod): string {
  const details = [
    `Método: ${method.label}`,
    `Tipo: ${method.type}`,
    `Titular: ${method.holder_full_name}`,
    `Cédula: ${method.id_number}`,
    method.phone ? `Teléfono: ${method.phone}` : null,
    method.bank_name ? `Banco: ${method.bank_name}` : null,
    method.account_number ? `Número de cuenta: ${method.account_number}` : null,
    method.account_type ? `Tipo de cuenta: ${method.account_type}` : null,
    `Dirección anterior: ${method.previous_full_address}`,
    `Dirección actual: ${method.current_full_address}`,
  ].filter((line): line is string => line !== null)

  return [...caseHeader(caseData), '', 'Datos para ayudar:', ...details].join('\n')
}
