import type { Metadata } from 'next'
import { DM_Mono, Lora, Nunito } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/shared/components/providers/query-provider'

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['300', '400', '500', '600', '700'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Red de Ayuda',
  description:
    'Registro verificado de casos de ayuda humanitaria en Venezuela.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es"
      className={`${lora.variable} ${nunito.variable} ${dmMono.variable}`}
    >
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
