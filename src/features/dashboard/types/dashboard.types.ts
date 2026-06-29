export interface DashboardMetrics {
  activeCases: number
  archivedCases: number
  totalHelpRecords: number
  totalAmountUsd: number
  casesWithoutHelp: number
}

export interface RecentDashboardCase {
  id: string
  publicCode: string
  fullName: string
  status: 'active' | 'archived'
  city: string
  state: string
  createdAt: string
}

export interface RecentDashboardHelpRecord {
  id: string
  caseId: string
  casePublicCode: string
  caseFullName: string
  title: string
  helpTypeName: string
  amountUsd: number | null
  helpedAt: string
}

export interface DashboardOverview {
  metrics: DashboardMetrics
  recentCases: RecentDashboardCase[]
  recentHelpRecords: RecentDashboardHelpRecord[]
}
