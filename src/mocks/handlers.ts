import type {
  Allocation,
  AuditEvent,
  CapacityRule,
  CapacitySnapshot,
  Deal,
  ExtractedRestriction,
  IntegrationStatus,
  LimitedPartner,
  ReportJob,
  Role,
  ScreeningRestrictionHit,
  ScreeningResult,
  ScreeningRun,
  SideLetterDocument,
  SignOff,
  UserAccount,
} from '../domain/types'
import {
  allocations,
  auditEvents,
  capacityRules,
  deals,
  integrations,
  limitedPartners,
  reportJobs,
  restrictions,
  roles,
  sideLetters,
  signOffs,
  users,
} from './fixtures'

function restrictionConflictsDeal(
  r: ExtractedRestriction,
  deal: Deal,
): string | null {
  const s = r.summary.toLowerCase()
  const sector = deal.sector.toLowerCase()
  const geo = deal.geography.toLowerCase()

  if (r.category === 'sector') {
    if (
      s.includes('fossil') &&
      (sector.includes('upstream') ||
        sector.includes('midstream') ||
        sector.includes('oil') ||
        sector.includes('gas'))
    ) {
      return 'Fossil fuel / hydrocarbon restriction applies to this sector profile.'
    }
    if (
      s.includes('gambling') &&
      (sector.includes('gaming') || sector.includes('casino'))
    ) {
      return 'Gaming exposure requires consent workflow per side letter.'
    }
  }

  if (r.category === 'geography') {
    if (s.includes('sanction') && geo.includes('iran')) {
      return 'Sanctions geography restriction triggered.'
    }
    if (s.includes('country x') && geo.includes('country x')) {
      return 'Country X prohibition applies.'
    }
  }

  if (r.category === 'esg') {
    if (
      s.includes('thermal coal') &&
      deal.esgFlags.includes('coal_exposure')
    ) {
      return 'Thermal coal ESG restriction applies.'
    }
  }

  return null
}

export function evaluateScreeningForDeal(deal: Deal): ScreeningResult[] {
  return limitedPartners.map((lp) => {
    const lpRestrictions = restrictions.filter((x) => x.lpId === lp.id)
    const hits: ScreeningRestrictionHit[] = []
    for (const r of lpRestrictions) {
      const reason = restrictionConflictsDeal(r, deal)
      if (reason) hits.push({ restrictionId: r.id, reason })
    }

    let outcome: ScreeningResult['outcome'] = 'eligible'
    if (hits.length) {
      const related = hits
        .map((h) => lpRestrictions.find((x) => x.id === h.restrictionId))
        .filter(Boolean) as ExtractedRestriction[]

      const draftHit = related.some((x) => x.reviewStatus === 'draft')
      const hardHit = related.some((x) => x.severity === 'hard')

      if (draftHit) outcome = 'needs_review'
      else if (hardHit) outcome = 'ineligible'
      else outcome = 'needs_review'
    }

    return { lpId: lp.id, outcome, hits }
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
  const rulePackVersion = 'rules-mock-2026.05'
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

export function listDeals(): Deal[] {
  return deals
}

export function listLPs(): LimitedPartner[] {
  return limitedPartners
}

export function getLpById(id: string): LimitedPartner | undefined {
  return limitedPartners.find((lp) => lp.id === id)
}

export function listSideLetters(): SideLetterDocument[] {
  return sideLetters
}

export function getSideLetterById(id: string): SideLetterDocument | undefined {
  return sideLetters.find((s) => s.id === id)
}

export function listRestrictions(): ExtractedRestriction[] {
  return restrictions
}

export function restrictionsForLp(lpId: string): ExtractedRestriction[] {
  return restrictions.filter((r) => r.lpId === lpId)
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

export function listUsers(): UserAccount[] {
  return users
}

export function listRoles(): Role[] {
  return roles
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
  row.lastSyncAt = row.connected ? new Date().toISOString() : undefined
  return row
}
