export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Public header will be added during Phase 5 */}
      <main>{children}</main>
    </div>
  )
}
