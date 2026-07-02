import { requireAuth } from '@/shared/lib/auth/guards'
import { createServerSupabaseClient } from '@/shared/lib/supabase/server'
import { createDashboardRepository } from '@/features/dashboard/repositories/dashboard.repository'
import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview'

export default async function DashboardPage() {
  const { profile } = await requireAuth()
  const canManage = profile.role === 'admin' || profile.role === 'campaign_admin'
  const client = await createServerSupabaseClient()
  const overview = await createDashboardRepository(client).getOverview()
  const firstName = profile.full_name.trim().split(/\s+/)[0] || profile.full_name

  return <DashboardOverview data={overview} firstName={firstName} canManage={canManage} />
}
