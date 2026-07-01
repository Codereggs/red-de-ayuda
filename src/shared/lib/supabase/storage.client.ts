import { createClient } from './client'
import { CAMPAIGN_RECEIPTS_BUCKET, CAMPAIGN_COVERS_BUCKET } from '@/shared/constants'
import { compressImage } from '@/shared/lib/image/compress-image'

export async function uploadReceiptFromClient(campaignId: string, file: File): Promise<string> {
  const client = createClient()
  // Comprimir imágenes antes de subir (ahorra espacio en Supabase).
  const toUpload = await compressImage(file)
  const ext = toUpload.name.split('.').pop() ?? 'jpg'
  const path = `${campaignId}/${Date.now()}.${ext}`

  const { error } = await client.storage.from(CAMPAIGN_RECEIPTS_BUCKET).upload(path, toUpload, {
    contentType: toUpload.type,
  })
  if (error) throw new Error(error.message)
  return path
}

/**
 * Sube una imagen de galería de campaña al bucket público.
 * Fuerza re-codificación a JPEG (comprime Y elimina metadatos EXIF/GPS).
 */
export async function uploadCampaignImageFromClient(
  campaignId: string,
  file: File,
): Promise<string> {
  const client = createClient()
  const processed = await compressImage(file, {
    forceReencode: true, // siempre re-codificar → comprime Y borra metadatos EXIF/GPS
    maxDimension: 1920,
    quality: 0.8,
  })
  const ext = processed.name.split('.').pop() ?? 'jpg'
  const path = `${campaignId}/${crypto.randomUUID()}.${ext}`

  const { error } = await client.storage.from(CAMPAIGN_COVERS_BUCKET).upload(path, processed, {
    contentType: processed.type,
  })
  if (error) throw new Error(error.message)
  return path
}
