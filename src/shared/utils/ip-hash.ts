import { createHash } from 'crypto'

/**
 * Hashes an IP address server-side before storing.
 * Formula: sha256(ip + IP_HASH_SECRET)
 * Never store the raw IP in the database — see spec/05-security-and-permissions.md.
 */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET ?? ''
  return createHash('sha256').update(ip + secret).digest('hex')
}
