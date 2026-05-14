export type PersonaId = 'gp' | 'compliance' | 'ir' | 'legal' | 'admin'

export interface FundContext {
  id: string
  name: string
  vintage: string
}

export interface Fund {
  id: string
  externalId: string | null
  name: string
  vintage: string | null
  strategy: string | null
  targetSizeUsd: number | null
  currency: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface LimitedPartner {
  id: string
  fundId: string
  name: string
  investorType: string
  commitmentUsd: number
  fundedUsd: number
}

/** Fund agreement & LP-specific instruments that drive screening + obligations. */
export type LegalInstrumentKind =
  | 'lpa'
  | 'side_letter'
  | 'side_letter_erisa'
  | 'mfn_election'
  | 'ima'
  | 'co_invest'

export interface LegalDocument {
  id: string
  fundId: string
  /** null = fund-wide instrument (e.g. LPA) */
  lpId: string | null
  /** Set when obligation/instrument is deal-specific (e.g. co-invest) */
  dealId: string | null
  kind: LegalInstrumentKind
  title: string
  uploadedAt: string
  reviewStatus: 'processing' | 'extracted' | 'confirmed'
  restrictionIds: string[]
}

/** @deprecated Use LegalDocument — identical shape */
export type SideLetterDocument = LegalDocument

export type RestrictionCategory =
  | 'sector'
  | 'geography'
  | 'esg'
  | 'leverage'
  | 'ebitda'
  | 'deal_type'
  | 'security_type'
  | 'other'

export type RestrictionSeverity = 'hard' | 'soft'

/** Structured clause projection used by deal screening (pass/fail). */
export interface ExtractedRestriction {
  id: string
  /** null = applies to all LPs in the fund (typical LPA-level rule in mock) */
  lpId: string | null
  legalDocumentId: string
  instrumentKind: LegalInstrumentKind
  /** Lower number wins when policies conflict (organizational default — Legal confirms). */
  precedenceRank: number
  category: RestrictionCategory
  severity: RestrictionSeverity
  summary: string
  sectionRef?: string
  rawQuote?: string
  effectiveFrom: string
  effectiveTo?: string
  clauseText?: string
  reviewStatus: 'draft' | 'confirmed' | 'rejected'
}

export interface Deal {
  id: string
  fundId: string
  name: string
  sector: string
  geography: string
  esgFlags: string[]
  /** Tags for mock screening (e.g. affiliate_sponsor, bridge_facility). */
  structureTags?: string[]
  proposedAmountUsd: number
  pipelineStage: string

  // ── Financial metrics (from DealCloud: LTMAdjEBITDA, LTMRevenue, etc.) ──
  /** LTM Adjusted EBITDA in USD */
  ebitdaUsd?: number
  /** LTM Total Revenue in USD */
  revenueUsd?: number
  /** Net leverage multiple (Total Debt / EBITDA) */
  leverageMultiple?: number
  /** Loan-to-value ratio as a percentage (0–100) */
  ltvPct?: number
  /** First-lien attachment point as a leverage turn */
  attachmentPoint?: number
  /** Last-dollar detachment point as a leverage turn */
  detachmentPoint?: number

  // ── Deal structure (from DealCloud: DealType, SecurityDescription, etc.) ──
  /** e.g. "First Lien Term Loan", "Second Lien", "Mezzanine", "Unitranche" */
  dealType?: string
  /** e.g. "Senior Secured", "Senior Unsecured", "Subordinated" */
  securityType?: string
  /** Whether the deal is sponsor-backed */
  sponsored?: boolean
  /** Whether there is an equity co-investment component */
  coInvest?: boolean
  /** Public or private company */
  publicOrPrivate?: 'public' | 'private'
}

export type ScreeningOutcome = 'eligible' | 'ineligible' | 'needs_review'

export interface ScreeningRestrictionHit {
  restrictionId: string
  reason: string
  instrumentKind: LegalInstrumentKind
  legalDocumentId: string
  instrumentTitle: string
  /** 0-based index into the fund’s instrument order; display as Priority (index + 1). */
  precedenceRank: number
}

export interface ScreeningResult {
  lpId: string
  outcome: ScreeningOutcome
  hits: ScreeningRestrictionHit[]
  concentrationHits: SectorConcentrationHit[]
}

export interface ScreeningRun {
  id: string
  dealId: string
  runAt: string
  runBy: string
  inputsHash: string
  rulePackVersion: string
  verifiedBeforeIc: boolean
  results: ScreeningResult[]
}

export interface CapacityRule {
  id: string
  lpId: string
  maxSingleInvestmentPct: number
  description: string
}

export interface Allocation {
  id: string
  lpId: string
  dealId: string
  dealName: string
  sector: string
  amountUsd: number
  closedAt: string
}

/** LP-level sector concentration limit extracted from side letter / LPA. */
export interface SectorConcentrationRule {
  id: string
  lpId: string
  legalDocumentId: string
  /** Case-insensitive substring match against Deal.sector */
  sectorPattern: string
  sectorLabel: string
  maxPct: number
  description: string
}

export interface SectorConcentrationHit {
  ruleId: string
  sectorLabel: string
  maxPct: number
  currentPct: number
  proposedPct: number
  currentAmountUsd: number
  proposedAmountUsd: number
}

export interface CapacitySnapshot {
  lpId: string
  commitmentUsd: number
  deployedUsd: number
  remainingCommitmentUsd: number
  concentrationLimitPct: number
  maxNewDealUsd: number
}

/** Structured clause projection for ongoing compliance (not pass/fail per deal). */
export type ObligationKind =
  | 'consent'
  | 'notice'
  | 'reporting'
  | 'mfn_election_window'
  | 'co_invest_allocation'
  | 'other'

export interface Obligation {
  id: string
  title: string
  kind: ObligationKind
  instrumentKind: LegalInstrumentKind
  lpId: string | null
  dealId: string | null
  legalDocumentId: string
  sectionRef?: string
  dueAt: string | null
  recurrence?: string
  ownerRole: string
  status: 'open' | 'done' | 'waived' | 'overdue'
  evidenceNote?: string
}

export type AuditEventType =
  | 'screening_run'
  | 'restriction_confirmed'
  | 'sign_off'
  | 'document_upload'
  | 'integration_sync'
  | 'obligation_completed'

export interface AuditEvent {
  id: string
  at: string
  actor: string
  persona: PersonaId
  type: AuditEventType
  summary: string
  entityRef?: string
}

export interface SignOff {
  id: string
  dealId: string
  dealName: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  assigneeRole: string
  screeningRunId: string
}

export interface ReportJob {
  id: string
  name: string
  requestedAt: string
  status: 'queued' | 'ready' | 'failed'
}

export interface IntegrationStatus {
  id: string
  name: string
  connected: boolean
  lastSyncAt?: string
}

export interface UserAccount {
  id: string
  name: string
  email: string
  /** Ordered list — first role is the primary for display purposes. */
  roleIds: string[]
}

export interface Role {
  id: string
  name: string
  permissions: string[]
}
