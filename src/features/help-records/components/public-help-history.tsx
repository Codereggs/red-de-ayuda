import { CalendarDays, HandHeart } from 'lucide-react'
import type { PublicHelpRecord } from '../types/help-records.types'

interface PublicHelpHistoryProps {
  records: PublicHelpRecord[]
}

function relativeDate(date: string): string {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.max(0, Math.round((today.getTime() - target.getTime()) / 86_400_000))

  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  return target.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PublicHelpHistory({ records }: PublicHelpHistoryProps) {
  return (
    <section className="bg-card border-border rounded-2xl border p-6">
      <h2 className="font-display text-foreground text-base font-medium">Historial de ayuda</h2>
      {records.length === 0 ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full">
            <HandHeart className="text-foreground size-5" />
          </div>
          <p className="text-muted-foreground text-sm">Sin ayudas todavía.</p>
        </div>
      ) : (
        <ol className="border-border mt-4 flex flex-col divide-y">
          {records.map((record) => (
            <li key={record.id} className="py-4 first:pt-0 last:pb-0">
              <p className="text-foreground text-sm leading-relaxed">
                Se registró ayuda de tipo{' '}
                <span className="font-semibold">{record.helpTypeName}</span>
                {record.associatedNeedNames.length > 0 && (
                  <>
                    {' '}
                    para{' '}
                    <span className="font-semibold">{record.associatedNeedNames.join(', ')}</span>
                  </>
                )}{' '}
                {relativeDate(record.helpedAt)}.
              </p>
              {record.description && (
                <p className="text-muted-foreground mt-1 text-sm">{record.description}</p>
              )}
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 font-mono">
                  <CalendarDays className="size-3.5" />
                  {relativeDate(record.helpedAt)}
                </span>
                {record.amountUsd !== null && (
                  <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 font-mono font-semibold">
                    Monto registrado: {record.amountUsd} USD
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
