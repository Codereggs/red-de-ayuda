const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Must run in Server Actions / Route Handlers only — needs TURNSTILE_SECRET_KEY.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!token) return false

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    }),
  })

  const result = (await response.json()) as { success: boolean }
  return result.success
}
