import { APP_NAME } from '@/shared/constants'
import { PublicCaseGrid } from '@/features/cases/components/public-case-grid'

export const metadata = {
  title: `${APP_NAME} — Registro verificado de ayuda`,
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-foreground text-3xl font-medium sm:text-4xl">
          Casos activos
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Personas y familias verificadas que necesitan ayuda. Los datos de contacto se muestran
          tras confirmar su uso responsable.
        </p>
      </div>
      <PublicCaseGrid />
    </main>
  )
}
