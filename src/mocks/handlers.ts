import type {
  Allocation,
  AuditEvent,
  CapacityRule,
  CapacitySnapshot,
  Deal,
  ExtractedRestriction,
  Fund,
  IntegrationStatus,
  LegalDocument,
  LegalInstrumentKind,
  LimitedPartner,
  Obligation,
  CreateObligationInput,
  ReportJob,
  Role,
  ScreeningResult,
  ScreeningRun,
  SectorConcentrationRule,
  SignOff,
  SyncJob,
  UserAccount,
} from '../domain/types'
import {
  allocations,
  auditEvents,
  capacityRules,
  deals,
  integrations,
  legalDocuments,
  limitedPartners,
  obligations,
  reportJobs,
  restrictions,
  roles,
  sectorConcentrationRules,
  sideLetters,
  signOffs,
  syncJobs,
  users,
  seedFunds,
} from './fixtures'
import { getEffectiveInstrumentOrder } from '../domain/instrumentPrecedenceStorage'
import {
  createScreeningRun as createScreeningRunCore,
  evaluateScreeningForDeal as evaluateScreeningForDealCore,
} from '../domain/screeningEvaluate'

/** Persisted fund registry for mock / offline UI — same source as Fund Management page. */
const MOCK_FUNDS_KEY = 'lip.mockFunds'

function readMockFunds(): Fund[] {
  try {
    const raw = localStorage.getItem(MOCK_FUNDS_KEY)
    if (!raw) {
      writeMockFunds(seedFunds)
      return [...seedFunds]
    }
    const parsed = JSON.parse(raw) as Fund[]
    if (!Array.isArray(parsed)) {
      writeMockFunds(seedFunds)
      return [...seedFunds]
    }
    const rows = parsed.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string')
    if (rows.length === 0) {
      writeMockFunds(seedFunds)
      return [...seedFunds]
    }
    return rows
  } catch {
    writeMockFunds(seedFunds)
    return [...seedFunds]
  }
}

function writeMockFunds(rows: Fund[]) {
  localStorage.setItem(MOCK_FUNDS_KEY, JSON.stringify(rows))
}

export function listFunds(): Fund[] {
  return readMockFunds()
}

export function createFund(input: {
  name: string
  vintage?: string | null
  strategy?: string | null
  targetSizeUsd?: number | null
  currency?: string
  status?: string
}): Fund {
  const now = new Date().toISOString()
  const rows = readMockFunds()
  const id = `fund-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const fund: Fund = {
    id,
    externalId: null,
    name: input.name,
    vintage: input.vintage ?? null,
    strategy: input.strategy ?? null,
    targetSizeUsd: input.targetSizeUsd ?? null,
    currency: input.currency ?? 'USD',
    status: input.status ?? 'fundraising',
    createdAt: now,
    updatedAt: now,
  }
  writeMockFunds([fund, ...rows])
  return fund
}

export function updateFund(
  fundId: string,
  patch: {
    name?: string
    vintage?: string | null
    strategy?: string | null
    targetSizeUsd?: number | null
    currency?: string
    status?: string
  },
): Fund | undefined {
  const rows = readMockFunds()
  const idx = rows.findIndex((f) => f.id === fundId)
  if (idx === -1) return undefined
  const cur = rows[idx]
  const next: Fund = {
    ...cur,
    name: patch.name ?? cur.name,
    vintage: patch.vintage !== undefined ? patch.vintage : cur.vintage,
    strategy: patch.strategy !== undefined ? patch.strategy : cur.strategy,
    targetSizeUsd: patch.targetSizeUsd !== undefined ? patch.targetSizeUsd : cur.targetSizeUsd,
    currency: patch.currency ?? cur.currency,
    status: patch.status ?? cur.status,
    updatedAt: new Date().toISOString(),
  }
  const copy = [...rows]
  copy[idx] = next
  writeMockFunds(copy)
  return next
}

function screeningContextForFund(fundId: string) {
  const lpsInFund = limitedPartners.filter((lp) => lp.fundId === fundId)
  const allocationsByLp: Record<string, Allocation[]> = {}
  for (const lp of lpsInFund) {
    allocationsByLp[lp.id] = allocations.filter((a) => a.lpId === lp.id)
  }
  return {
    lps: lpsInFund,
    restrictions,
    allocationsByLp,
    sectorConcentrationRules,
    legalDocuments,
    getInstrumentOrder: getEffectiveInstrumentOrder,
  }
}

export function evaluateScreeningForDeal(deal: Deal): ScreeningResult[] {
  return evaluateScreeningForDealCore(deal, screeningContextForFund(deal.fundId))
}

export function createScreeningRun(
  deal: Deal,
  runBy: string,
): ScreeningRun {
  return createScreeningRunCore(
    deal,
    screeningContextForFund(deal.fundId),
    runBy,
    'rules-mock-2026.05+LPA+ERISA',
  )
}

export function getDealById(id: string): Deal | undefined {
  return deals.find((d) => d.id === id)
}

export function listDeals(fundId?: string): Deal[] {
  if (!fundId) return deals
  return deals.filter((d) => d.fundId === fundId)
}

export function createDeal(input: Omit<Deal, 'id'>): Deal {
  const deal: Deal = { ...input, id: `deal-${Date.now()}` }
  deals.push(deal)
  return deal
}

export function listLPs(fundId?: string): LimitedPartner[] {
  if (!fundId) return limitedPartners
  return limitedPartners.filter((lp) => lp.fundId === fundId)
}

export function getLpById(id: string): LimitedPartner | undefined {
  return limitedPartners.find((lp) => lp.id === id)
}

export function listLegalDocuments(fundId?: string): LegalDocument[] {
  const src = fundId ? legalDocuments.filter((d) => d.fundId === fundId) : legalDocuments
  return [...src].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
}

export function getLegalDocumentById(id: string): LegalDocument | undefined {
  return legalDocuments.find((d) => d.id === id)
}

/** Mock-only: pretend upload — mutates fixtures list. Sets fundId from LP when omitted. */
export function uploadLegalDocumentForLp(
  lpId: string,
  fileName: string,
  opts?: { fundId?: string; instrumentKind?: LegalInstrumentKind; title?: string },
): LegalDocument {
  const lp = limitedPartners.find((p) => p.id === lpId)
  const fundId =
    opts?.fundId && opts.fundId.trim().length > 0
      ? opts.fundId.trim()
      : lp?.fundId ?? ''
  const kind = opts?.instrumentKind ?? 'side_letter'
  const baseTitle =
    opts?.title?.trim() ||
    fileName.replace(/\.[^/.]+$/, '').trim() ||
    'Uploaded instrument'
  const doc: LegalDocument = {
    id: `doc-mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    fundId,
    lpId,
    dealId: null,
    kind,
    title: baseTitle,
    uploadedAt: new Date().toISOString(),
    reviewStatus: 'processing',
    restrictionIds: [],
    ingestionSource: 'manual',
    pipelineStage: 'uploaded',
  }
  legalDocuments.unshift(doc)
  return doc
}

/** @deprecated narrow catalog — prefer listLegalDocuments + filter */
export function listSideLetters(): LegalDocument[] {
  return sideLetters
}

/** @deprecated use getLegalDocumentById */
export function getSideLetterById(id: string): LegalDocument | undefined {
  return getLegalDocumentById(id)
}

export function listRestrictions(): ExtractedRestriction[] {
  return restrictions
}

export function restrictionsForLp(lpId: string): ExtractedRestriction[] {
  return restrictions.filter((r) => r.lpId === null || r.lpId === lpId)
}

export function restrictionsForDocument(
  legalDocumentId: string,
): ExtractedRestriction[] {
  return restrictions.filter((r) => r.legalDocumentId === legalDocumentId)
}

export function listObligations(): Obligation[] {
  return [...obligations].sort((a, b) => {
    const ta = a.dueAt ?? ''
    const tb = b.dueAt ?? ''
    if (!ta && !tb) return 0
    if (!ta) return 1
    if (!tb) return -1
    return ta < tb ? -1 : 1
  })
}

export function obligationsForLp(lpId: string): Obligation[] {
  return obligations.filter((o) => o.lpId === null || o.lpId === lpId)
}

export function obligationsForDocument(
  legalDocumentId: string,
): Obligation[] {
  return obligations.filter((o) => o.legalDocumentId === legalDocumentId)
}

export function createObligation(input: CreateObligationInput): Obligation {
  const row: Obligation = {
    id: `obl-${Math.random().toString(36).slice(2, 10)}`,
    title: input.title,
    kind: input.kind,
    instrumentKind: input.instrumentKind ?? 'lpa',
    lpId: input.lpId ?? null,
    dealId: input.dealId ?? null,
    legalDocumentId: input.legalDocumentId,
    sourceRestrictionId: input.sourceRestrictionId,
    sectionRef: input.sectionRef,
    dueAt: input.dueAt ?? null,
    recurrence: input.recurrence,
    ownerRole: input.ownerRole ?? 'Compliance',
    status: 'open',
    evidenceNote: input.evidenceNote,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  }
  obligations.push(row)
  return row
}

export function completeObligation(
  id: string,
  actor: string,
): Obligation | undefined {
  const row = obligations.find((o) => o.id === id)
  if (!row || row.status === 'done') return undefined
  row.status = 'done'
  row.evidenceNote =
    row.evidenceNote ?? `Marked complete by ${actor} (mock evidence link).`
  appendAuditEvent({
    at: new Date().toISOString(),
    actor,
    persona: 'compliance',
    type: 'obligation_completed',
    summary: `Obligation ${id} marked complete.`,
    entityRef: id,
  })
  return row
}

export function allocationsForLp(lpId: string): Allocation[] {
  return allocations.filter((a) => a.lpId === lpId)
}

export function capacityRuleForLp(lpId: string): CapacityRule | undefined {
  return capacityRules.find((c) => c.lpId === lpId)
}

export function capacitySnapshotForLp(lp: LimitedPartner): CapacitySnapshot {
  const rule = capacityRuleForLp(lp.id)
  const pct = rule?.maxSingleInvestmentPct ?? 15
  const deployed = allocations
    .filter((a) => a.lpId === lp.id)
    .reduce((s, a) => s + a.amountUsd, 0)
  const remainingCommitment = lp.commitmentUsd - lp.fundedUsd
  const maxNew = Math.min(
    (lp.commitmentUsd * pct) / 100,
    remainingCommitment,
  )
  return {
    lpId: lp.id,
    commitmentUsd: lp.commitmentUsd,
    deployedUsd: deployed,
    remainingCommitmentUsd: remainingCommitment,
    concentrationLimitPct: pct,
    maxNewDealUsd: Math.max(0, Math.round(maxNew)),
  }
}

export function listAuditEvents(): AuditEvent[] {
  return [...auditEvents].sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function listSignOffs(): SignOff[] {
  return signOffs
}

export function listReportJobs(): ReportJob[] {
  return reportJobs
}

export function listIntegrations(): IntegrationStatus[] {
  return integrations
}

export function listSyncJobs(integrationId?: string): SyncJob[] {
  const rows = [...syncJobs].sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
  return integrationId ? rows.filter((j) => j.integrationId === integrationId) : rows
}

export function runIntegrationSyncDemo(integrationId: string): SyncJob | null {
  const integ = integrations.find((i) => i.id === integrationId)
  if (!integ || !integ.connected) return null
  const now = new Date().toISOString()
  const success = integrationId === 'int-dc'
  const job: SyncJob = {
    id: `sync-${Date.now()}`,
    integrationId,
    startedAt: now,
    finishedAt: now,
    status: success ? 'success' : 'partial',
    message: success
      ? 'Delta sync (demo): reconciled deals, LPs, and legal catalog; duplicate LPA digest skipped — v2 already active.'
      : 'No new files in gateway inbox; connector healthy.',
    documentsUpserted: success ? 1 : 0,
    restrictionsTouched: success ? 3 : 0,
  }
  syncJobs.unshift(job)
  integ.lastSyncAt = now
  integ.lastSyncStatus = job.status === 'success' ? 'success' : 'partial'
  integ.lastSyncDetail = job.message
  appendAuditEvent({
    at: now,
    actor: integ.name,
    persona: 'admin',
    type: 'sync_job_completed',
    summary: `${job.message} (job ${job.id})`,
    entityRef: job.id,
  })
  return job
}

export function listUsers(): UserAccount[] {
  return users
}

export function listRoles(): Role[] {
  return roles
}

function syncFundedUsd(lpId: string): void {
  const lp = limitedPartners.find((x) => x.id === lpId)
  if (!lp) return
  lp.fundedUsd = allocations
    .filter((a) => a.lpId === lpId)
    .reduce((sum, a) => sum + a.amountUsd, 0)
}

export function addAllocation(
  lpId: string,
  dealName: string,
  sector: string,
  amountUsd: number,
  closedAt: string,
): Allocation {
  const newAlloc: Allocation = {
    id: `a-${Date.now()}`,
    lpId,
    dealId: `manual-${Date.now()}`,
    dealName,
    sector,
    amountUsd,
    closedAt,
  }
  allocations.push(newAlloc)
  syncFundedUsd(lpId)
  return newAlloc
}

export function updateAllocation(
  allocationId: string,
  patch: { dealName?: string; sector?: string; amountUsd?: number; closedAt?: string },
): Allocation | undefined {
  const alloc = allocations.find((a) => a.id === allocationId)
  if (!alloc) return undefined
  if (patch.dealName !== undefined) alloc.dealName = patch.dealName
  if (patch.sector !== undefined) alloc.sector = patch.sector
  if (patch.amountUsd !== undefined) alloc.amountUsd = patch.amountUsd
  if (patch.closedAt !== undefined) alloc.closedAt = patch.closedAt
  syncFundedUsd(alloc.lpId)
  return alloc
}

export function removeAllocation(allocationId: string): boolean {
  const idx = allocations.findIndex((a) => a.id === allocationId)
  if (idx === -1) return false
  const lpId = allocations[idx].lpId
  allocations.splice(idx, 1)
  syncFundedUsd(lpId)
  return true
}

export function listSectorConcentrationRules(lpId?: string): SectorConcentrationRule[] {
  return lpId
    ? sectorConcentrationRules.filter((r) => r.lpId === lpId)
    : sectorConcentrationRules
}

export function sectorBreakdownForLp(lpId: string): Array<{ sector: string; amountUsd: number; pct: number }> {
  const lp = limitedPartners.find((x) => x.id === lpId)
  if (!lp) return []
  const lpAllocs = allocations.filter((a) => a.lpId === lpId)
  const map: Record<string, number> = {}
  for (const a of lpAllocs) {
    map[a.sector] = (map[a.sector] ?? 0) + a.amountUsd
  }
  return Object.entries(map)
    .map(([sector, amountUsd]) => ({
      sector,
      amountUsd,
      pct: Math.round((amountUsd / lp.commitmentUsd) * 1000) / 10,
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd)
}

export function updateLpCommitment(
  lpId: string,
  commitmentUsd: number,
  fundedUsd: number,
): LimitedPartner | undefined {
  return updateLimitedPartner(lpId, { commitmentUsd, fundedUsd })
}

export function createLimitedPartner(input: {
  name: string
  fundId?: string
  entityType?: string
  commitmentUsd?: number
}): LimitedPartner {
  const lp: LimitedPartner = {
    id: `lp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fundId: input.fundId ?? '',
    name: input.name,
    investorType: input.entityType ?? 'unknown',
    commitmentUsd: input.commitmentUsd ?? 0,
    fundedUsd: 0,
  }
  limitedPartners.push(lp)
  return lp
}

export function updateLimitedPartner(
  lpId: string,
  patch: {
    name?: string
    fundId?: string
    entityType?: string
    commitmentUsd?: number
    fundedUsd?: number
  },
): LimitedPartner | undefined {
  const lp = limitedPartners.find((x) => x.id === lpId)
  if (!lp) return undefined
  if (patch.name !== undefined) lp.name = patch.name
  if (patch.fundId !== undefined) lp.fundId = patch.fundId
  if (patch.entityType !== undefined) lp.investorType = patch.entityType
  if (patch.commitmentUsd !== undefined) lp.commitmentUsd = patch.commitmentUsd
  if (patch.fundedUsd !== undefined) lp.fundedUsd = patch.fundedUsd
  return lp
}

export function setUserRoles(userId: string, roleIds: string[]): UserAccount | undefined {
  const user = users.find((u) => u.id === userId)
  if (!user) return undefined
  const valid = roleIds.filter((id) => roles.some((r) => r.id === id))
  user.roleIds = valid
  return user
}

export function appendAuditEvent(event: Omit<AuditEvent, 'id'>): AuditEvent {
  const row: AuditEvent = {
    ...event,
    id: `ae-${Date.now()}`,
  }
  auditEvents.unshift(row)
  return row
}

export function toggleIntegration(id: string): IntegrationStatus | undefined {
  const row = integrations.find((i) => i.id === id)
  if (!row) return undefined
  row.connected = !row.connected
  if (row.connected) {
    row.lastSyncAt = new Date().toISOString()
    row.lastSyncStatus = 'idle'
    row.lastSyncDetail = 'Connected — run a sync to pull latest.'
  } else {
    row.lastSyncAt = undefined
    row.lastSyncStatus = 'idle'
    row.lastSyncDetail = 'Disconnected.'
  }
  return row
}
