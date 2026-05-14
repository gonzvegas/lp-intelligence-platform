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
  LimitedPartner,
  Obligation,
  ReportJob,
  Role,
  ScreeningRestrictionHit,
  ScreeningResult,
  ScreeningRun,
  SectorConcentrationHit,
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
} from './fixtures'
import { getEffectiveInstrumentOrder } from '../domain/instrumentPrecedenceStorage'
import { precedenceSortIndex } from '../domain/legal'

/** Persisted fund registry for mock / offline UI — same source as Fund Management page. */
const MOCK_FUNDS_KEY = 'lip.mockFunds'

function readMockFunds(): Fund[] {
  try {
    const raw = localStorage.getItem(MOCK_FUNDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Fund[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string')
  } catch {
    return []
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

function restrictionConflictsDeal(
  r: ExtractedRestriction,
  deal: Deal,
): string | null {
  const s = r.summary.toLowerCase()
  const sector = deal.sector.toLowerCase()
  const geo = deal.geography.toLowerCase()
  const tags = deal.structureTags ?? []

  // ── Structural tags ────────────────────────────────────────────────────────
  if (s.includes('prohibited transaction') && tags.includes('affiliate_sponsor')) {
    return 'ERISA / plan asset analysis may be required (affiliate economics).'
  }
  if (s.includes('advisory committee') && s.includes('affiliate') && tags.includes('affiliate_sponsor')) {
    return 'LPA requires Advisory Committee disclosure for sponsor-affiliate transactions.'
  }

  // ── Sector ─────────────────────────────────────────────────────────────────
  if (r.category === 'sector') {
    if (s.includes('fossil') && (sector.includes('upstream') || sector.includes('midstream') || sector.includes('oil') || sector.includes('gas'))) {
      return 'Fossil fuel / hydrocarbon restriction applies to this sector profile.'
    }
    if (s.includes('gambling') && (sector.includes('gaming') || sector.includes('casino'))) {
      return 'Gaming exposure requires consent workflow per side letter.'
    }
  }

  // ── Geography ──────────────────────────────────────────────────────────────
  if (r.category === 'geography') {
    if (s.includes('sanction') && geo.includes('iran')) return 'Sanctions geography restriction triggered.'
    if (s.includes('country x') && geo.includes('country x')) return 'Country X prohibition applies.'
  }

  // ── ESG ────────────────────────────────────────────────────────────────────
  if (r.category === 'esg') {
    if (s.includes('thermal coal') && deal.esgFlags.includes('coal_exposure')) {
      return 'Thermal coal ESG restriction applies.'
    }
  }

  // ── Leverage ───────────────────────────────────────────────────────────────
  if (r.category === 'leverage' && deal.leverageMultiple !== undefined) {
    const match = s.match(/(\d+\.?\d*)\s*x/)
    if (match) {
      const cap = parseFloat(match[1])
      if (deal.leverageMultiple > cap) {
        return `Leverage of ${deal.leverageMultiple}x exceeds the ${cap}x cap per side letter.`
      }
    }
  }

  // ── EBITDA minimum ─────────────────────────────────────────────────────────
  if (r.category === 'ebitda' && deal.ebitdaUsd !== undefined) {
    const match = s.match(/\$(\d+(?:\.\d+)?)\s*[mM]/)
    if (match) {
      const minUsd = parseFloat(match[1]) * 1_000_000
      if (deal.ebitdaUsd < minUsd) {
        const fmt = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`
        return `LTM EBITDA of ${fmt(deal.ebitdaUsd)} is below the ${fmt(minUsd)} minimum.`
      }
    }
  }

  // ── Deal type ──────────────────────────────────────────────────────────────
  if (r.category === 'deal_type' && deal.dealType) {
    const dt = deal.dealType.toLowerCase()
    if (s.includes('mezzanine') && (dt.includes('mezzanine') || dt.includes('mezz'))) {
      return `Deal type "${deal.dealType}" is restricted — mezzanine/subordinated debt prohibited.`
    }
    if (s.includes('second lien') && dt.includes('second lien')) {
      return `Deal type "${deal.dealType}" is restricted — second lien debt prohibited.`
    }
    if (s.includes('senior secured only') && !dt.includes('first lien') && !dt.includes('unitranche') && !dt.includes('senior secured')) {
      return `Deal type "${deal.dealType}" does not meet senior secured only requirement.`
    }
  }

  // ── Security type ──────────────────────────────────────────────────────────
  if (r.category === 'security_type' && deal.securityType) {
    const st = deal.securityType.toLowerCase()
    if ((s.includes('unsecured') || s.includes('second lien')) && (st.includes('unsecured') || st.includes('second lien'))) {
      return `Security type "${deal.securityType}" requires prior written consent per side letter.`
    }
  }

  return null
}

function sectorConcentrationCheck(lp: LimitedPartner, deal: Deal): SectorConcentrationHit[] {
  const rules = sectorConcentrationRules.filter((r) => r.lpId === lp.id)
  const lpAllocs = allocations.filter((a) => a.lpId === lp.id)
  const hits: SectorConcentrationHit[] = []

  for (const rule of rules) {
    const pattern = rule.sectorPattern.toLowerCase()
    const matchesDeal = deal.sector.toLowerCase().includes(pattern)
    if (!matchesDeal) continue

    const currentAmount = lpAllocs
      .filter((a) => a.sector.toLowerCase().includes(pattern))
      .reduce((sum, a) => sum + a.amountUsd, 0)

    const currentPct = (currentAmount / lp.commitmentUsd) * 100
    const proposedPct = ((currentAmount + deal.proposedAmountUsd) / lp.commitmentUsd) * 100

    if (proposedPct > rule.maxPct) {
      hits.push({
        ruleId: rule.id,
        sectorLabel: rule.sectorLabel,
        maxPct: rule.maxPct,
        currentPct: Math.round(currentPct * 10) / 10,
        proposedPct: Math.round(proposedPct * 10) / 10,
        currentAmountUsd: currentAmount,
        proposedAmountUsd: deal.proposedAmountUsd,
      })
    }
  }

  return hits
}

export function evaluateScreeningForDeal(deal: Deal): ScreeningResult[] {
  const lpsInFund = limitedPartners.filter((lp) => lp.fundId === deal.fundId)

  return lpsInFund.map((lp) => {
    const instrumentOrder = getEffectiveInstrumentOrder(deal.fundId, lp.id)
    const lpRestrictions = restrictions.filter(
      (x) => x.lpId === null || x.lpId === lp.id,
    )
    const hits: ScreeningRestrictionHit[] = []
    for (const r of lpRestrictions) {
      const reason = restrictionConflictsDeal(r, deal)
      if (reason) {
        const doc = legalDocuments.find((d) => d.id === r.legalDocumentId)
        hits.push({
          restrictionId: r.id,
          reason,
          instrumentKind: r.instrumentKind,
          legalDocumentId: r.legalDocumentId,
          instrumentTitle: doc?.title ?? r.legalDocumentId,
          precedenceRank: precedenceSortIndex(r.instrumentKind, instrumentOrder),
        })
      }
    }

    hits.sort((a, b) => {
      const d = a.precedenceRank - b.precedenceRank
      if (d !== 0) return d
      return a.restrictionId.localeCompare(b.restrictionId)
    })

    const concentrationHits = sectorConcentrationCheck(lp, deal)

    let outcome: ScreeningResult['outcome'] = 'eligible'
    if (hits.length || concentrationHits.length) {
      const related = hits
        .map((h) => lpRestrictions.find((x) => x.id === h.restrictionId))
        .filter(Boolean) as ExtractedRestriction[]

      const draftHit = related.some((x) => x.reviewStatus === 'draft')
      const hardHit = related.some((x) => x.severity === 'hard')

      if (concentrationHits.length) outcome = 'needs_review'
      else if (draftHit) outcome = 'needs_review'
      else if (hardHit) outcome = 'ineligible'
      else outcome = 'needs_review'
    }

    return { lpId: lp.id, outcome, hits, concentrationHits }
  })
}

function hashStub(deal: Deal, version: string): string {
  const payload = `${deal.id}:${deal.sector}:${deal.geography}:${deal.proposedAmountUsd}:${version}`
  let h = 0
  for (let i = 0; i < payload.length; i++)
    h = Math.imul(31, h) + payload.charCodeAt(i)
  return `sha256-stub:${(h >>> 0).toString(16).padStart(8, '0')}`
}

export function createScreeningRun(
  deal: Deal,
  runBy: string,
): ScreeningRun {
  const results = evaluateScreeningForDeal(deal)
  const rulePackVersion = 'rules-mock-2026.05+LPA+ERISA'
  return {
    id: `sr-${Date.now()}`,
    dealId: deal.id,
    runAt: new Date().toISOString(),
    runBy,
    inputsHash: hashStub(deal, rulePackVersion),
    rulePackVersion,
    verifiedBeforeIc: true,
    results,
  }
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
