/**
 * Standard return shape for all Server Actions.
 * Discriminated union — always check `success` before accessing `data` or `error`.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
