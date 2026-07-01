import { createClient } from './client'
import { CAMPAIGN_RECEIPTS_BUCKET } from '@/shared/constants'

export async function uploadReceiptFromClient(campaignId: string, file: File): Promise<string> {
  const client = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${campaignId}/${Date.now()}.${ext}`

  const { error } = await client.storage.from(CAMPAIGN_RECEIPTS_BUCKET).upload(path, file)
  if (error) throw new Error(error.message)
  return path
}
