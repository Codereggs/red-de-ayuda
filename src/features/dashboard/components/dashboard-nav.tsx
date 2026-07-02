'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, LayoutDashboard, ScrollText, Users, Megaphone, UserCog } from 'lucide-react'

interface DashboardNavProps {
  isAdmin: boolean
  isCampaignAdminOrAdmin: boolean
  mobile?: boolean
}

export function DashboardNav({ isAdmin, isCampaignAdminOrAdmin, mobile = false }: DashboardNavProps) {
  const pathname = usePathname()
  const items = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, exact: true },
    ...(isCampaignAdminOrAdmin
      ? [
          { href: '/dashboard/cases', label: 'Casos', icon: ClipboardList, exact: false },
          { href: '/dashboard/campaigns', label: 'Campañas', icon: Megaphone, exact: false },
        ]
      : [
          { href: '/dashboard/campaigns', label: 'Campañas', icon: Megaphone, exact: false },
        ]),
    ...(isAdmin
      ? [
          { href: '/dashboard/users', label: 'Usuarios', icon: Users, exact: false },
          { href: '/dashboard/logs', label: 'Registros', icon: ScrollText, exact: false },
        ]
      : []),
    { href: '/dashboard/profile', label: 'Mi cuenta', icon: UserCog, exact: false },
  ]

  return (
    <nav
      className={mobile ? 'flex gap-1 overflow-x-auto px-4 pb-3' : 'flex flex-col gap-1 px-3'}
      aria-label="Navegación del panel"
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              mobile
                ? `inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
            }
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
