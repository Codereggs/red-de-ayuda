export const PAGE_SIZE = 20

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString('base64url')
}

export function decodeCursor(cursor: string): number {
  const n = parseInt(Buffer.from(cursor, 'base64url').toString(), 10)
  return isNaN(n) ? 0 : n
}
