import type {
  Case,
  CaseNeed,
  CasePhone,
  CasePrivateData,
  AssistanceMethod,
  HelpRecord,
  NeedCategory,
  SituationCategory,
} from '@/shared/types/database.types'

/** Public-safe case data returned by the public API */
export interface PublicCase extends Pick<
  Case,
  | 'id'
  | 'public_code'
  | 'case_type'
  | 'full_name'
  | 'public_notes'
  | 'public_contact_place'
  | 'country'
  | 'state'
  | 'city'
  | 'last_helped_at'
> {
  situation: Pick<SituationCategory, 'id' | 'name'>
  needs: PublicCaseNeed[]
  helpRecordsCount: number
  lastHelpSummary: string | null
}

export interface PublicCaseNeed extends Pick<CaseNeed, 'id' | 'quantity' | 'unit' | 'comments'> {
  category: Pick<NeedCategory, 'id' | 'name'>
}

/** Full case as seen by helpers/admins — includes private data */
export interface PrivateCase extends Case {
  situation: SituationCategory
  privateData: CasePrivateData | null
  phones: CasePhone[]
  needs: PrivateCaseNeed[]
  assistanceMethods: AssistanceMethod[]
  helpRecords: HelpRecord[]
}

export interface PrivateCaseNeed extends CaseNeed {
  category: NeedCategory
}

/** Payload returned by the reveal endpoint — service role only */
export interface RevealAssistancePayload {
  phones: CasePhone[]
  assistanceMethods: AssistanceMethod[]
}

/** Filters for the public case list */
export interface PublicCaseFilters {
  state?: string
  city?: string
  situationId?: string
  needCategoryId?: string
  search?: string
  cursor?: string
  randomSeed?: string
}

/** Filters for the private (dashboard) case list */
export interface PrivateCaseFilters extends PublicCaseFilters {
  status?: 'active' | 'archived'
  caseType?: 'person' | 'family'
}

/** Input for archiving a case */
export interface ArchiveCaseInput {
  caseId: string
  archivedByUserId: string
  archiveReason: string
}

/** Shared private data sub-input used by create and update */
interface PrivateDataInput {
  idNumber: string
  birthDate?: string
  previousFullAddress: string
  currentFullAddress: string
  verificationNotes: string
  privateNotes?: string
}

/** Shared phone sub-input */
interface PhoneInput {
  phone: string
  label?: string
  isPrimary: boolean
}

export interface CreateCaseInput {
  fullName: string
  caseType: 'person' | 'family'
  situationCategoryId: string
  publicContactPlace: string
  state: string
  city: string
  country: string
  publicNotes?: string
  createdByUserId: string
  privateData: PrivateDataInput
  phones: PhoneInput[]
}

export interface UpdateCaseInput extends Omit<CreateCaseInput, 'createdByUserId'> {
  caseId: string
  updatedByUserId: string
}
