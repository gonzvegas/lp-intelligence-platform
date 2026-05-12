export type PersonaId = 'gp' | 'compliance' | 'ir' | 'legal' | 'admin'

export interface FundContext {
  id: string
  name: string
  vintage: string
}

export interface LimitedPartner {
  id: string
  name: string
  investorType: string
  commitmentUsd: number
  fundedUsd: number
}

export type RestrictionCategory = 'sector' | 'geography' | 'esg' | 'other'

export type RestrictionSeverity = 'hard' | 'soft'

export interface ExtractedRestriction {
  id: string
  lpId: string
  sideLetterId: string
  category: RestrictionCategory
  severity: RestrictionSeverity
  summary: string
  rawQuote?: string
  effectiveFrom: string
  effectiveTo?: string
  reviewStatus: 'draft' | 'confirmed'
}

export interface SideLetterDocument {
  id: string
  lpId: string
  title: string
  uploadedAt: string
  reviewStatus: 'processing' | 'extracted' | 'confirmed'
  restrictionIds: string[]
}

export interface Deal {
  id: string
  name: string
  sector: string
  geography: string
  esgFlags: string[]
  proposedAmountUsd: number
  pipelineStage: string
}

export type ScreeningOutcome = 'eligible' | 'ineligible' | 'needs_review'

export interface ScreeningRestrictionHit {
  restrictionId: string
  reason: string
}

export interface ScreeningResult {
  lpId: string
  outcome: ScreeningOutcome
  hits: ScreeningRestrictionHit[]
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
  amountUsd: number
  closedAt: string
}

export interface CapacitySnapshot {
  lpId: string
  commitmentUsd: number
  deployedUsd: number
  remainingCommitmentUsd: number
  concentrationLimitPct: number
  maxNewDealUsd: number
}

export type AuditEventType =
  | 'screening_run'
  | 'restriction_confirmed'
  | 'sign_off'
  | 'document_upload'
  | 'integration_sync'

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
  roleId: string
}

export interface Role {
  id: string
  name: string
  permissions: string[]
}
