'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Users } from 'lucide-react'
import type { PublicCase } from '../types/cases.types'
import { buildPublicCaseCopy } from '../utils/case-copy'

interface PublicCaseCardProps {
  case: PublicCase
  search?: string
  onHelp: () => void
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-VE', {
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
  const [copied, setCopied] = useState(false)

  async function copyCard() {
    await navigator.clipboard.writeText(buildPublicCaseCopy(c, window.location.origin))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article className="bg-card border-border hover:border-accent flex flex-col gap-3 rounded-2xl border p-5 transition-colors duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground font-mono text-xs">{c.public_code}</p>
          <Link href={`/someone/${c.id}`} className="hover:text-primary transition-colors">
            <h3 className="font-display text-foreground mt-0.5 truncate text-lg font-medium">
              <Highlight text={c.full_name} search={search} />
            </h3>
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        <Highlight text={`${c.city}, ${c.state}, ${c.country}`} search={search} />
      </p>

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Users className="size-3.5" />
        <span>{c.case_type === 'person' ? 'Persona' : 'Familia'}</span>
        <span aria-hidden="true">·</span>
        <span>
          {c.needs.length} {c.needs.length === 1 ? 'necesidad' : 'necesidades'}
        </span>
      </div>

      {c.needs.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {c.needs.slice(0, 4).map((need) => {
            const label = `${need.category.name}${need.quantity ? ` ×${need.quantity}${need.unit ? ` ${need.unit}` : ''}` : ''}`

            return (
              <span
                key={need.id}
                title={label}
                className="bg-muted text-muted-foreground truncate rounded-full px-2.5 py-1 text-center text-xs"
              >
                {label}
              </span>
            )
          })}
          {c.needs.length > 4 && (
            <span className="text-muted-foreground col-span-2 text-xs">
              +{c.needs.length - 4} {c.needs.length - 4 === 1 ? 'necesidad' : 'necesidades'} más
            </span>
          )}
        </div>
      )}

      <div className="border-border mt-auto flex flex-col gap-3 border-t pt-3">
        <p className="text-muted-foreground font-mono text-xs">
          {c.last_helped_at ? `Última ayuda: ${formatDate(c.last_helped_at)}` : 'Sin ayudas todavía'}
          <span aria-hidden="true"> · </span>
          {c.helpRecordsCount} {c.helpRecordsCount === 1 ? 'ayuda' : 'ayudas'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copyCard()}
            className="border-primary text-primary hover:bg-primary/10 focus-visible:ring-primary inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2"
            aria-label={`Copiar ficha de ${c.full_name}`}
            title="Copiar ficha"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copiada' : 'Copiar ficha'}
          </button>
          <button
            type="button"
            onClick={onHelp}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary min-w-0 flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2"
          >
            Ayudar
          </button>
        </div>
      </div>
    </article>
  )
}
