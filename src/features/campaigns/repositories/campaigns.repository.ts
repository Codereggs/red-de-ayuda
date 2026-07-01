import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Campaign,
  CampaignAssistanceMethod,
  CampaignContribution,
} from '@/shared/types/database.types'
import type {
  PublicCampaign,
  PublicCampaignFilters,
  PrivateCampaignFilters,
  CreateCampaignInput,
  UpdateCampaignInput,
  ArchiveCampaignInput,
  AddCampaignMemberInput,
  CreateContributionInput,
  CreateCampaignAssistanceMethodInput,
  UpdateCampaignAssistanceMethodInput,
  ContributionWithCreator,
} from '../types/campaigns.types'
import type { Paginated } from '@/shared/types/common.types'
import { PAGE_SIZE, encodeCursor, decodeCursor } from '@/shared/utils/pagination'

type DBClient = Pick<SupabaseClient<Database>, 'from'>

type RawPublicMember = {
  id: string
  campaign_id: string
  case_id: string
  deleted_at: string | null
  cases: { id: string; full_name: string } | null
  campaign_member_needs: {
    id: string
    need_category_id: string
    price_usd: number
    purchased_at: string | null
    need_categories: { id: string; name: string } | null
  }[]
}

export class CampaignsRepository {
  constructor(private readonly db: DBClient) {}

  // ── Public reads ─────────────────────────────────────────────────────────

  async listPublic(filters: PublicCampaignFilters): Promise<Paginated<PublicCampaign>> {
    const offset = filters.cursor ? decodeCursor(filters.cursor) : 0

    let query = this.db
      .from('campaigns')
      .select('id, public_code, title, description, goal_amount_usd, raised_amount_usd, status, cover_image_path, created_at, updated_at')
      .eq('verified', true)
      .is('archived_at', null)
      .is('deleted_at', null)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) {
      const s = filters.search.replace(/[%_,()]/g, ' ').trim()
      if (s) query = query.ilike('title', `%${s}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE)

    const { data, error } = await query
    if (error) throw new Error(`[CampaignsRepository.listPublic] ${error.message}`)

    const rows = (data ?? []) as Campaign[]
    const hasMore = rows.length > PAGE_SIZE
    const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows

    const memberMap = await this.batchPublicMembers(pageRows.map((r) => r.id))

    return {
      data: pageRows.map((row) => this.toPublicCampaign(row, memberMap.get(row.id) ?? [])),
      nextCursor: hasMore ? encodeCursor(offset + PAGE_SIZE) : null,
      hasMore,
    }
  }

  async findPublicById(id: string): Promise<PublicCampaign | null> {
    const { data, error } = await this.db
      .from('campaigns')
      .select('id, public_code, title, description, goal_amount_usd, raised_amount_usd, status, cover_image_path, created_at, updated_at')
      .eq('id', id)
      .eq('verified', true)
      .is('archived_at', null)
      .is('deleted_at', null)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`[CampaignsRepository.findPublicById] ${error.message}`)
    if (!data) return null

    const row = data as Campaign
    const memberMap = await this.batchPublicMembers([row.id])
    return this.toPublicCampaign(row, memberMap.get(row.id) ?? [])
  }

  // ── Private reads ────────────────────────────────────────────────────────

  async listPrivate(filters: PrivateCampaignFilters): Promise<Paginated<Campaign>> {
    const offset = filters.cursor ? decodeCursor(filters.cursor) : 0

    let query = this.db.from('campaigns').select('*').is('deleted_at', null)

    if (!filters.includeArchived) query = query.is('archived_at', null)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) {
      const s = filters.search.replace(/[%_,()]/g, ' ').trim()
      if (s) query = query.ilike('title', `%${s}%`)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE)

    const { data, error } = await query
    if (error) throw new Error(`[CampaignsRepository.listPrivate] ${error.message}`)

    const rows = (data ?? []) as Campaign[]
    const hasMore = rows.length > PAGE_SIZE
    const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows

    return {
      data: pageRows,
      nextCursor: hasMore ? encodeCursor(offset + PAGE_SIZE) : null,
      hasMore,
    }
  }

  async findPrivateById(id: string): Promise<Campaign | null> {
    const { data, error } = await this.db
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`[CampaignsRepository.findPrivateById] ${error.message}`)
    return data as Campaign | null
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(input: CreateCampaignInput): Promise<Campaign> {
    const { data, error } = await this.db
      .from('campaigns')
      .insert({
        title: input.title,
        description: input.description ?? null,
        goal_amount_usd: input.goalAmountUsd,
        created_by_user_id: input.createdByUserId,
      })
      .select('*')
      .single()

    if (error) throw new Error(`[CampaignsRepository.create] ${error.message}`)
    if (!data) throw new Error('[CampaignsRepository.create] No data returned')
    return data as Campaign
  }

  async update(input: UpdateCampaignInput): Promise<void> {
    const { error } = await this.db
      .from('campaigns')
      .update({
        title: input.title,
        description: input.description ?? null,
        goal_amount_usd: input.goalAmountUsd,
        updated_by_user_id: input.updatedByUserId,
      })
      .eq('id', input.campaignId)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.update] ${error.message}`)
  }

  async archive(input: ArchiveCampaignInput): Promise<void> {
    const { error } = await this.db
      .from('campaigns')
      .update({
        archive_reason: input.archiveReason,
        archived_by_user_id: input.archivedByUserId,
        archived_at: new Date().toISOString(),
      })
      .eq('id', input.campaignId)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.archive] ${error.message}`)
  }

  async updateStatus(
    campaignId: string,
    status: Campaign['status'],
    updatedByUserId: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('campaigns')
      .update({ status, updated_by_user_id: updatedByUserId })
      .eq('id', campaignId)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.updateStatus] ${error.message}`)
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async addMember(input: AddCampaignMemberInput): Promise<string> {
    const { data: caseData, error: caseError } = await this.db
      .from('cases')
      .insert({
        full_name: input.fullName,
        case_type: 'person',
        verified: false,
        created_by_user_id: input.createdByUserId,
      })
      .select('id')
      .single()

    if (caseError) throw new Error(`[CampaignsRepository.addMember - case] ${caseError.message}`)
    if (!caseData) throw new Error('[CampaignsRepository.addMember] No case data returned')

    const caseId = caseData.id

    if (input.idNumber || input.privateNotes) {
      const { error: pdError } = await this.db.from('case_private_data').insert({
        case_id: caseId,
        id_number: input.idNumber ?? null,
        private_notes: input.privateNotes ?? null,
      })
      if (pdError) {
        throw new Error(`[CampaignsRepository.addMember - private_data] ${pdError.message}`)
      }
    }

    const { data: linkData, error: linkError } = await this.db
      .from('campaign_cases')
      .insert({
        campaign_id: input.campaignId,
        case_id: caseId,
        created_by_user_id: input.createdByUserId,
      })
      .select('id')
      .single()

    if (linkError || !linkData) {
      throw new Error(`[CampaignsRepository.addMember - link] ${linkError?.message}`)
    }

    if (input.needs.length > 0) {
      const { error: needsError } = await this.db.from('campaign_member_needs').insert(
        input.needs.map((n) => ({
          campaign_case_id: linkData.id,
          need_category_id: n.needCategoryId,
          price_usd: n.priceUsd,
        })),
      )
      if (needsError) {
        throw new Error(`[CampaignsRepository.addMember - needs] ${needsError.message}`)
      }
    }

    return caseId
  }

  async removeMember(campaignId: string, caseId: string): Promise<void> {
    const { error } = await this.db
      .from('campaign_cases')
      .update({ deleted_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('case_id', caseId)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.removeMember] ${error.message}`)
  }

  async toggleNeedPurchased(needId: string, purchased: boolean): Promise<string | null> {
    const purchased_at = purchased ? new Date().toISOString() : null
    const { error } = await this.db
      .from('campaign_member_needs')
      .update({ purchased_at })
      .eq('id', needId)

    if (error) throw new Error(`[CampaignsRepository.toggleNeedPurchased] ${error.message}`)
    return purchased_at
  }

  // ── Contributions ─────────────────────────────────────────────────────────

  async listContributions(campaignId: string): Promise<ContributionWithCreator[]> {
    const { data, error } = await this.db
      .from('campaign_contributions')
      .select('*')
      .eq('campaign_id', campaignId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`[CampaignsRepository.listContributions] ${error.message}`)

    const rows = (data ?? []) as CampaignContribution[]
    const userIds = [
      ...new Set([
        ...rows.map((r) => r.created_by_user_id).filter((id): id is string => !!id),
        ...rows.map((r) => r.verified_by_user_id).filter((id): id is string => !!id),
      ]),
    ]

    const profileMap = new Map<string, { fullName: string; email: string }>()
    if (userIds.length > 0) {
      const { data: profiles, error: pErr } = await this.db
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
      if (pErr) throw new Error(`[CampaignsRepository.listContributions - profiles] ${pErr.message}`)
      for (const p of profiles ?? []) {
        profileMap.set(p.id, { fullName: p.full_name, email: p.email })
      }
    }

    return rows.map((row) => ({
      ...row,
      createdBy: row.created_by_user_id ? (profileMap.get(row.created_by_user_id) ?? null) : null,
      verifiedBy: row.verified_by_user_id
        ? (profileMap.get(row.verified_by_user_id) ?? null)
        : null,
    }))
  }

  async findHelperContribution(campaignId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('campaign_contributions')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('created_by_user_id', userId)
      .is('deleted_at', null)
      .limit(1)

    if (error) throw new Error(`[CampaignsRepository.findHelperContribution] ${error.message}`)
    return (data ?? []).length > 0
  }

  async createContribution(input: CreateContributionInput): Promise<CampaignContribution> {
    const { data, error } = await this.db
      .from('campaign_contributions')
      .insert({
        campaign_id: input.campaignId,
        amount_usd: input.amountUsd,
        contributor_name: input.contributorName ?? null,
        reference: input.reference ?? null,
        receipt_image_path: input.receiptImagePath ?? null,
        transferred_at: input.transferredAt,
        notes: input.notes ?? null,
        created_by_user_id: input.createdByUserId,
      })
      .select('*')
      .single()

    if (error) throw new Error(`[CampaignsRepository.createContribution] ${error.message}`)
    if (!data) throw new Error('[CampaignsRepository.createContribution] No data returned')
    return data as CampaignContribution
  }

  async verifyContribution(id: string, verifiedByUserId: string): Promise<void> {
    const { error } = await this.db
      .from('campaign_contributions')
      .update({
        status: 'verified',
        verified_by_user_id: verifiedByUserId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.verifyContribution] ${error.message}`)
  }

  async rejectContribution(id: string, rejectedByUserId: string): Promise<void> {
    const { error } = await this.db
      .from('campaign_contributions')
      .update({
        status: 'rejected',
        verified_by_user_id: rejectedByUserId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.rejectContribution] ${error.message}`)
  }

  async softDeleteContribution(id: string): Promise<void> {
    const { error } = await this.db
      .from('campaign_contributions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.softDeleteContribution] ${error.message}`)
  }

  // ── Assistance methods ────────────────────────────────────────────────────

  async listAssistanceMethods(campaignId: string): Promise<CampaignAssistanceMethod[]> {
    const { data, error } = await this.db
      .from('campaign_assistance_methods')
      .select('*')
      .eq('campaign_id', campaignId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })

    if (error) throw new Error(`[CampaignsRepository.listAssistanceMethods] ${error.message}`)
    return (data ?? []) as CampaignAssistanceMethod[]
  }

  async createAssistanceMethod(
    input: CreateCampaignAssistanceMethodInput,
  ): Promise<CampaignAssistanceMethod> {
    const { data, error } = await this.db
      .from('campaign_assistance_methods')
      .insert({
        campaign_id: input.campaignId,
        type: input.type,
        label: input.label,
        is_primary: input.isPrimary ?? false,
        is_active: input.isActive ?? true,
        holder_full_name: input.holderFullName,
        id_number: input.idNumber ?? null,
        phone: input.phone ?? null,
        bank_name: input.bankName ?? null,
        account_number: input.accountNumber ?? null,
        account_type: input.accountType ?? null,
        alias: input.alias ?? null,
        country_code: input.countryCode ?? 'VE',
        notes: input.notes ?? null,
      })
      .select('*')
      .single()

    if (error)
      throw new Error(`[CampaignsRepository.createAssistanceMethod] ${error.message}`)
    if (!data) throw new Error('[CampaignsRepository.createAssistanceMethod] No data returned')
    return data as CampaignAssistanceMethod
  }

  async updateAssistanceMethod(input: UpdateCampaignAssistanceMethodInput): Promise<void> {
    const { error } = await this.db
      .from('campaign_assistance_methods')
      .update({
        type: input.type,
        label: input.label,
        is_primary: input.isPrimary ?? false,
        is_active: input.isActive ?? true,
        holder_full_name: input.holderFullName,
        id_number: input.idNumber ?? null,
        phone: input.phone ?? null,
        bank_name: input.bankName ?? null,
        account_number: input.accountNumber ?? null,
        account_type: input.accountType ?? null,
        alias: input.alias ?? null,
        country_code: input.countryCode ?? 'VE',
        notes: input.notes ?? null,
      })
      .eq('id', input.methodId)
      .is('deleted_at', null)

    if (error)
      throw new Error(`[CampaignsRepository.updateAssistanceMethod] ${error.message}`)
  }

  async softDeleteAssistanceMethod(id: string): Promise<void> {
    const { error } = await this.db
      .from('campaign_assistance_methods')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error)
      throw new Error(`[CampaignsRepository.softDeleteAssistanceMethod] ${error.message}`)
  }

  /** Service-role client required — bypasses RLS. */
  async revealAssistanceMethods(campaignId: string): Promise<CampaignAssistanceMethod[]> {
    const { data, error } = await this.db
      .from('campaign_assistance_methods')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })

    if (error)
      throw new Error(`[CampaignsRepository.revealAssistanceMethods] ${error.message}`)
    return (data ?? []) as CampaignAssistanceMethod[]
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async batchPublicMembers(
    campaignIds: string[],
  ): Promise<Map<string, PublicCampaign['members']>> {
    if (campaignIds.length === 0) return new Map()

    const { data, error } = await this.db
      .from('campaign_cases')
      .select('id, campaign_id, case_id, deleted_at, cases(id, full_name), campaign_member_needs(id, need_category_id, price_usd, purchased_at, need_categories(id, name))')
      .in('campaign_id', campaignIds)
      .is('deleted_at', null)

    if (error) throw new Error(`[CampaignsRepository.batchPublicMembers] ${error.message}`)

    const map = new Map<string, PublicCampaign['members']>()

    for (const row of (data ?? []) as unknown as RawPublicMember[]) {
      if (!row.cases) continue
      const members = map.get(row.campaign_id) ?? []
      members.push({
        caseId: row.cases.id,
        fullName: row.cases.full_name,
        needs: (row.campaign_member_needs ?? [])
          .filter((n) => n.need_categories !== null)
          .map((n) => ({
            id: n.id,
            needCategoryId: n.need_category_id,
            needCategoryName: n.need_categories!.name,
            price_usd: n.price_usd,
            purchased_at: n.purchased_at,
          })),
      })
      map.set(row.campaign_id, members)
    }

    return map
  }

  private toPublicCampaign(row: Campaign, members: PublicCampaign['members']): PublicCampaign {
    const progressPct =
      row.goal_amount_usd > 0
        ? Math.min(100, Math.round((row.raised_amount_usd / row.goal_amount_usd) * 100))
        : 0

    return {
      id: row.id,
      public_code: row.public_code,
      title: row.title,
      description: row.description,
      goal_amount_usd: row.goal_amount_usd,
      raised_amount_usd: row.raised_amount_usd,
      status: row.status,
      cover_image_path: row.cover_image_path,
      created_at: row.created_at,
      updated_at: row.updated_at,
      progressPct,
      members,
    }
  }
}

export function createCampaignsRepository(db: DBClient) {
  return new CampaignsRepository(db)
}
