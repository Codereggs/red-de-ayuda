import { CAMPAIGN_COVERS_BUCKET } from '@/shared/constants'

/** Deterministic public URL for an object in a public bucket (no client needed). */
export function publicStorageUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}

export function campaignImageUrl(path: string): string {
  return publicStorageUrl(CAMPAIGN_COVERS_BUCKET, path)
}
