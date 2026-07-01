import { APP_NAME } from '@/shared/constants'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createCampaignsRepository } from '@/features/campaigns/repositories/campaigns.repository'
import { PublicCampaignGrid } from '@/features/campaigns/components/public-campaign-grid'

export const metadata = {
  title: `${APP_NAME} — Campañas de ayuda`,
}

export default async function HomePage() {
  const client = await createServerSupabaseClient()
  const repo = createCampaignsRepository(client)
  const result = await repo.listPublic({})
  const campaigns = result.data

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-foreground text-3xl font-medium sm:text-4xl">
          Campañas de ayuda
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Jornadas de recaudación verificadas. Tu aporte ayuda a múltiples familias a la vez.
        </p>
      </div>
      <PublicCampaignGrid campaigns={campaigns} />
    </main>
  )
}
