import type { FC } from 'react'
import * as Flags from 'country-flag-icons/react/3x2'

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code (e.g. "VE", "AR"). */
  code: string
  className?: string
  title?: string
}

/**
 * Renders a real SVG flag (reliable on Windows, unlike emoji flags).
 * Falls back to a globe glyph for unknown codes.
 */
export function CountryFlag({ code, className = 'h-4 w-6 rounded-sm', title }: CountryFlagProps) {
  const Flag = (Flags as Record<string, FC<{ className?: string; title?: string }>>)[
    code?.toUpperCase()
  ]
  if (!Flag) {
    return (
      <span className={className} aria-hidden title={title}>
        🌐
      </span>
    )
  }
  return <Flag className={className} title={title} />
}
