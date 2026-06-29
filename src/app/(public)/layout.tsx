import Link from 'next/link'
import { AppLogo } from '@/shared/components/app-logo'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-background/90 border-border sticky top-0 z-30 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <AppLogo />
          <Link
            href="/login"
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full px-4 py-2 text-sm font-semibold transition-colors"
          >
            Acceso del equipo
          </Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-6 text-center text-xs sm:px-6">
          Registro verificado para conectar ayuda responsable.
        </div>
      </footer>
    </div>
  )
}
