export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar will be added during Phase 6 */}
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
