'use client'

import { Copy } from 'lucide-react'
import type { PublicCase } from '../types/cases.types'
import { buildPublicCaseCopy } from '../utils/case-copy'

interface PublicCaseCardProps {
  case: PublicCase
  search?: string
  onHelp: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Highlight({ text, search }: { text: string; search?: string }) {
  const query = search?.trim()
  if (!query) return text

  const index = text.toLocaleLowerCase('es').indexOf(query.toLocaleLowerCase('es'))
  if (index < 0) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accent text-accent-foreground rounded-sm">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  )
}

export function PublicCaseCard({ case: c, search, onHelp }: PublicCaseCardProps) {
  async function copyCard() {
    await navigator.clipboard.writeText(buildPublicCaseCopy(c, window.location.origin))
  }

  return (
    <article className="bg-card border-border hover:border-accent flex flex-col gap-3 rounded-2xl border p-5 transition-colors duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground font-mono text-xs">{c.public_code}</p>
          <h3 className="font-display text-foreground mt-0.5 truncate text-lg font-medium">
            <Highlight text={c.full_name} search={search} />
          </h3>
        </div>
        <span className="bg-secondary/60 text-secondary-foreground shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
          {c.situation.name}
        </span>
      </div>

      <p className="text-muted-foreground text-xs">
        <Highlight text={`${c.city}, ${c.state}`} search={search} />
      </p>

      {c.needs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.needs.map((need) => (
            <span
              key={need.id}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
            >
              {need.category.name}
              {need.quantity ? ` ×${need.quantity}${need.unit ? ` ${need.unit}` : ''}` : ''}
            </span>
          ))}
        </div>
      )}

      <div className="border-border mt-auto flex items-center justify-between border-t pt-3">
        <div className="text-muted-foreground flex items-center gap-3 font-mono text-xs">
          {c.last_helped_at && <span title="Última ayuda">{formatDate(c.last_helped_at)}</span>}
          {c.helpRecordsCount > 0 && (
            <span>
              {c.helpRecordsCount} {c.helpRecordsCount === 1 ? 'ayuda' : 'ayudas'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copyCard()}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary rounded-full p-2 transition-colors focus:outline-none focus-visible:ring-2"
            aria-label={`Copiar ficha de ${c.full_name}`}
            title="Copiar ficha"
          >
            <Copy className="size-4" />
          </button>
          <button
            type="button"
            onClick={onHelp}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2"
          >
            Ayudar
          </button>
        </div>
      </div>
    </article>
  )
}
