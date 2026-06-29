import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type {
  DashboardOverview,
  RecentDashboardCase,
  RecentDashboardHelpRecord,
} from '../types/dashboard.types'

type DBClient = Pick<SupabaseClient<Database>, 'from'>

type RawRecentHelpRecord = {
  id: string
  case_id: string
  title: string
  amount_usd: number | null
  helped_at: string
  help_types: { name: string } | null
  cases: { public_code: string; full_name: string } | null
}

export class DashboardRepository {
  constructor(private readonly db: DBClient) {}

  async getOverview(): Promise<DashboardOverview> {
    const [
      activeCasesResult,
      archivedCasesResult,
      totalHelpRecordsResult,
      amountsResult,
      casesWithoutHelpResult,
      recentCasesResult,
      recentHelpRecordsResult,
    ] = await Promise.all([
      this.db
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('deleted_at', null),
      this.db
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'archived')
        .is('deleted_at', null),
      this.db
        .from('help_records')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
      this.db.from('help_records').select('amount_usd').is('deleted_at', null),
      this.db
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('last_helped_at', null)
        .is('deleted_at', null),
      this.db
        .from('cases')
        .select('id, public_code, full_name, status, city, state, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      this.db
        .from('help_records')
        .select(
          'id, case_id, title, amount_usd, helped_at, help_types(name), cases(public_code, full_name)',
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const errors = [
      activeCasesResult.error,
      archivedCasesResult.error,
      totalHelpRecordsResult.error,
      amountsResult.error,
      casesWithoutHelpResult.error,
      recentCasesResult.error,
      recentHelpRecordsResult.error,
    ].filter((error) => error !== null)

    if (errors.length > 0) {
      throw new Error(`[DashboardRepository.getOverview] ${errors[0].message}`)
    }

    const recentCases: RecentDashboardCase[] = (recentCasesResult.data ?? []).map((row) => ({
      id: row.id,
      publicCode: row.public_code,
      fullName: row.full_name,
      status: row.status,
      city: row.city,
      state: row.state,
      createdAt: row.created_at,
    }))

    const recentHelpRecords: RecentDashboardHelpRecord[] = (
      (recentHelpRecordsResult.data ?? []) as unknown as RawRecentHelpRecord[]
    ).map((row) => ({
      id: row.id,
      caseId: row.case_id,
      casePublicCode: row.cases?.public_code ?? '—',
      caseFullName: row.cases?.full_name ?? 'Caso no disponible',
      title: row.title,
      helpTypeName: row.help_types?.name ?? 'Ayuda',
      amountUsd: row.amount_usd,
      helpedAt: row.helped_at,
    }))

    return {
      metrics: {
        activeCases: activeCasesResult.count ?? 0,
        archivedCases: archivedCasesResult.count ?? 0,
        totalHelpRecords: totalHelpRecordsResult.count ?? 0,
        totalAmountUsd: (amountsResult.data ?? []).reduce(
          (total, row) => total + (row.amount_usd ?? 0),
          0,
        ),
        casesWithoutHelp: casesWithoutHelpResult.count ?? 0,
      },
      recentCases,
      recentHelpRecords,
    }
  }
}

export function createDashboardRepository(db: DBClient) {
  return new DashboardRepository(db)
}
