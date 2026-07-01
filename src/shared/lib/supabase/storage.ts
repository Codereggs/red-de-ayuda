import { createServiceSupabaseClient } from './server'
import { CAMPAIGN_RECEIPTS_BUCKET, CAMPAIGN_COVERS_BUCKET } from '@/shared/constants'

export async function uploadCampaignReceipt(campaignId: string, file: File): Promise<string> {
  const client = createServiceSupabaseClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${campaignId}/${Date.now()}.${ext}`

  const { error } = await client.storage.from(CAMPAIGN_RECEIPTS_BUCKET).upload(path, file)
  if (error) throw new Error(`[uploadCampaignReceipt] ${error.message}`)
  return path
}

export async function getCampaignReceiptSignedUrl(path: string): Promise<string> {
  const client = createServiceSupabaseClient()
  const { data, error } = await client.storage
    .from(CAMPAIGN_RECEIPTS_BUCKET)
    .createSignedUrl(path, 3600)
  if (error) throw new Error(`[getCampaignReceiptSignedUrl] ${error.message}`)
  return data.signedUrl
}

export async function uploadCampaignCover(
  campaignId: string,
  file: File,
): Promise<{ path: string; publicUrl: string }> {
  const client = createServiceSupabaseClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${campaignId}/${Date.now()}.${ext}`

  const { error } = await client.storage.from(CAMPAIGN_COVERS_BUCKET).upload(path, file)
  if (error) throw new Error(`[uploadCampaignCover] ${error.message}`)

  const {
    data: { publicUrl },
  } = client.storage.from(CAMPAIGN_COVERS_BUCKET).getPublicUrl(path)

  return { path, publicUrl }
}
