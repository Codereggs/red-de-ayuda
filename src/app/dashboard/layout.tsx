import Link from 'next/link'
import { HeartHandshake } from 'lucide-react'
import { requireAuth } from '@/shared/lib/auth/guards'
import { LogoutButton } from '@/features/users/components/logout-button'
import { DashboardNav } from '@/features/dashboard/components/dashboard-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAuth()
  const isAdmin = profile.role === 'admin'

  return (
    <div className="bg-background min-h-screen md:flex">
      <aside className="bg-sidebar border-border hidden w-64 shrink-0 flex-col border-r md:sticky md:top-0 md:flex md:h-screen">
        <div className="p-5">
          <Link href="/" className="text-foreground flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
              <HeartHandshake className="size-5" />
            </span>
            <span className="font-display text-lg font-medium">Red de Ayuda</span>
          </Link>
        </div>

        <DashboardNav isAdmin={isAdmin} />

        <div className="border-border mt-auto border-t p-4">
          <p className="text-foreground truncate px-2 text-sm font-semibold">{profile.full_name}</p>
          <p className="text-muted-foreground mt-0.5 truncate px-2 text-xs">{profile.email}</p>
          <LogoutButton className="text-muted-foreground hover:bg-muted hover:text-foreground mt-3 w-full rounded-full px-3.5 py-2 text-left text-sm font-semibold transition-colors disabled:opacity-60" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="bg-sidebar border-border sticky top-0 z-30 border-b md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="text-foreground flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full">
                <HeartHandshake className="size-4" />
              </span>
              <span className="font-display font-medium">Red de Ayuda</span>
            </Link>
            <LogoutButton className="text-muted-foreground hover:bg-muted rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60" />
          </div>
          <DashboardNav isAdmin={isAdmin} mobile />
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
