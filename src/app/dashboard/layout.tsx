import { requireAuth } from '@/shared/lib/auth/guards'
import { LogoutButton } from '@/features/users/components/logout-button'
import { DashboardNav } from '@/features/dashboard/components/dashboard-nav'
import { AppLogo } from '@/shared/components/app-logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAuth()
  const isAdmin = profile.role === 'admin'
  const isCampaignAdminOrAdmin = profile.role === 'admin' || profile.role === 'campaign_admin'

  return (
    <div className="bg-background min-h-screen md:flex">
      <aside className="bg-sidebar border-border hidden w-64 shrink-0 flex-col border-r md:sticky md:top-0 md:flex md:h-screen">
        <div className="p-5">
          <AppLogo />
        </div>

        <DashboardNav isAdmin={isAdmin} isCampaignAdminOrAdmin={isCampaignAdminOrAdmin} />

        <div className="border-border mt-auto border-t p-4">
          <p className="text-foreground truncate px-2 text-sm font-semibold">{profile.full_name}</p>
          <p className="text-muted-foreground mt-0.5 truncate px-2 text-xs">{profile.email}</p>
          <LogoutButton className="text-muted-foreground hover:bg-muted hover:text-foreground mt-3 w-full rounded-full px-3.5 py-2 text-left text-sm font-semibold transition-colors disabled:opacity-60" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="bg-sidebar border-border sticky top-0 z-30 border-b md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <AppLogo size="sm" />
            <LogoutButton className="text-muted-foreground hover:bg-muted rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60" />
          </div>
          <DashboardNav isAdmin={isAdmin} isCampaignAdminOrAdmin={isCampaignAdminOrAdmin} mobile />
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
