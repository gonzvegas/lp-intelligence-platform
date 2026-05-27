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
  /** DealCloud external id when synced */
  externalId?: string | null
  fundId: string
  name: string
  investorType: string
  jurisdiction?: string | null
  lpStatus?: string
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

/** Stages for ingestion → extraction → legal sign-off → governing version. */
export type DocumentPipelineStage =
  | 'uploaded'
  | 'parsing'
  | 'extracted'
  | 'legal_review'
  | 'active'
  | 'archived'

export type DocumentIngestionSource = 'manual' | 'dealcloud' | 'csv_import'

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
  /** Version for this instrument chain (v1, v2 …). */
  versionNumber?: number
  supersedesDocumentId?: string | null
  replacedByDocumentId?: string | null
  /** ISO date — when this version is treated as the governing text. */
  effectiveFrom?: string
  ingestionSource?: DocumentIngestionSource
  /** When omitted, UI infers from `reviewStatus`. */
  pipelineStage?: DocumentPipelineStage
  /** True when blob storage has a PDF for this instrument. */
  hasContent?: boolean
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
  | 'concentration'
  | 'erisa'
  | 'co_invest'
  | 'reporting'
  | 'mfn'
  | 'instrument'
  | 'other'

/** Extraction often returns coarse labels beyond the canonical union. */
export type RestrictionCategoryInput = RestrictionCategory | (string & {})

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
  category: RestrictionCategoryInput
  severity: RestrictionSeverity
  summary: string
  sectionRef?: string
  rawQuote?: string
  effectiveFrom: string
  effectiveTo?: string
  clauseText?: string
  reviewStatus: 'draft' | 'confirmed' | 'rejected'
  /** PDF page (1-based) when extraction linked a source chunk. */
  pageNum?: number
  /** Denormalized from parent document version at extraction time. */
  documentVersionNumber?: number
  /** Pipeline / sync batch that produced this row (traceability). */
  extractionBatchId?: string
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
  sourceRestrictionId?: string
  sectionRef?: string
  dueAt: string | null
  recurrence?: string
  ownerRole: string
  status: 'open' | 'done' | 'waived' | 'overdue'
  evidenceNote?: string
  createdBy?: string
  createdAt?: string
}

export type CreateObligationInput = {
  title: string
  kind: ObligationKind
  instrumentKind?: LegalInstrumentKind
  lpId?: string | null
  dealId?: string | null
  legalDocumentId: string
  sourceRestrictionId?: string
  sectionRef?: string
  dueAt?: string | null
  recurrence?: string
  ownerRole?: string
  evidenceNote?: string
  createdBy?: string
}

export type AuditEventType =
  | 'screening_run'
  | 'restriction_confirmed'
  | 'restriction_rejected'
  | 'sign_off'
  | 'document_upload'
  | 'integration_sync'
  | 'obligation_created'
  | 'obligation_completed'
  | 'sync_job_completed'
  | 'document_versioned'
  | 'pipeline_stage_changed'

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
  /** Outcome of the most recent completed sync job. */
  lastSyncStatus?: 'success' | 'partial' | 'failed' | 'idle'
  /** Human-readable detail for IC / ops (counts, conflicts). */
  lastSyncDetail?: string
}

/** One integration run — shown for transparency (“what did sync do?”). */
export interface SyncJob {
  id: string
  integrationId: string
  startedAt: string
  finishedAt: string
  status: 'success' | 'partial' | 'failed'
  message: string
  documentsUpserted: number
  restrictionsTouched: number
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
