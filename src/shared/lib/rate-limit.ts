import { createHash } from 'crypto'
import { RATE_LIMIT } from '@/shared/constants'

interface Window {
  count: number
  resetAt: number
}

interface State {
  minute: Window
  hour: Window
}

const store = new Map<string, State>()

function fresh(ms: number): Window {
  return { count: 0, resetAt: Date.now() + ms }
}

export function checkRevealRateLimit(ipHash: string): { ok: boolean; error?: string } {
  const now = Date.now()
  const s = store.get(ipHash) ?? { minute: fresh(60_000), hour: fresh(3_600_000) }

  if (now > s.minute.resetAt) s.minute = fresh(60_000)
  if (now > s.hour.resetAt) s.hour = fresh(3_600_000)

  if (s.minute.count >= RATE_LIMIT.REVEAL_PER_MINUTE) {
    store.set(ipHash, s)
    return {
      ok: false,
      error: 'Demasiadas solicitudes. Espera un minuto antes de intentar de nuevo.',
    }
  }
  if (s.hour.count >= RATE_LIMIT.REVEAL_PER_HOUR) {
    store.set(ipHash, s)
    return { ok: false, error: 'Límite de solicitudes por hora alcanzado. Inténtalo más tarde.' }
  }

  s.minute.count++
  s.hour.count++
  store.set(ipHash, s)
  return { ok: true }
}

export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET
  if (!secret) throw new Error('IP_HASH_SECRET is required to hash client IP addresses')

  return createHash('sha256')
    .update(ip + secret)
    .digest('hex')
}
