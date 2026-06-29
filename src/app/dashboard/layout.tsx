import { requireAuth } from '@/shared/lib/auth/guards'
import { LogoutButton } from '@/features/users/components/logout-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAuth()

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="mt-auto border-t border-border p-4 flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground truncate px-1">{profile.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
