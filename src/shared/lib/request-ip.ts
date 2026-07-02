import type { NextRequest } from 'next/server'

/**
 * Resolves the client IP from a trusted source.
 *
 * Do NOT trust the left-most value of `x-forwarded-for`: it is fully
 * client-controlled and can be spoofed to evade rate limiting and poison the
 * hashed IP stored in access logs. On Vercel (and most managed platforms) the
 * platform sets `x-real-ip` to the real connecting IP after stripping any
 * client-supplied headers, so we prefer it. As a fallback we take the
 * right-most `x-forwarded-for` entry (the one appended by the closest trusted
 * proxy) rather than the left-most.
 */
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }

  return 'unknown'
}
