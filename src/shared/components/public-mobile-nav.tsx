'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '/', label: 'Campañas' },
  { href: '/casos', label: 'Casos' },
  { href: '/login', label: 'Acceso del equipo' },
]

export function PublicMobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
        aria-label="Menú"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="bg-background border-border absolute inset-x-0 top-full border-b px-4 py-3 shadow-sm">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-foreground hover:bg-muted rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
