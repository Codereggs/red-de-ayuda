import Image from 'next/image'
import Link from 'next/link'
import { APP_NAME } from '@/shared/constants'
import { CountryFlag } from '@/shared/components/country-flag'

interface AppLogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

const sizes = {
  sm: 32,
  md: 40,
  lg: 56,
}

export function AppLogo({ href = '/', size = 'md', showName = true }: AppLogoProps) {
  const px = sizes[size]

  const inner = (
    <span className="flex items-center gap-2">
      <Image
        src="/logos/logotipo-red-de-ayuda.png"
        alt={APP_NAME}
        width={px}
        height={px}
        className="shrink-0"
        priority
      />
      {showName && (
        <>
          <span className="font-display text-lg font-medium">{APP_NAME}</span>
          <CountryFlag
            code="VE"
            title="Venezuela"
            className="h-4 w-6 shrink-0 rounded-sm shadow-sm"
          />
        </>
      )}
    </span>
  )

  if (!href) return inner

  return (
    <Link href={href} className="text-foreground">
      {inner}
    </Link>
  )
}
