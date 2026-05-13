import type {
  Allocation,
  AuditEvent,
  CapacityRule,
  CapacitySnapshot,
  Deal,
  ExtractedRestriction,
  IntegrationStatus,
  LegalDocument,
  LimitedPartner,
  Obligation,
  ReportJob,
  Role,
  ScreeningRestrictionHit,
  ScreeningResult,
  ScreeningRun,
  SignOff,
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
  const tags = deal.structureTags ?? []

  if (
    s.includes('prohibited transaction') &&
    tags.includes('affiliate_sponsor')
  ) {
    return 'ERISA / plan asset analysis may be required (affiliate economics).'
  }
  if (
    s.includes('advisory committee') &&
    s.includes('affiliate') &&
    tags.includes('affiliate_sponsor')
  ) {
    return 'LPA requires Advisory Committee disclosure for sponsor-affiliate transactions.'
  }

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
          precedenceRank: r.precedenceRank,
        })
      }
    }

    hits.sort((a, b) => a.precedenceRank - b.precedenceRank)

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

export function listDeals(): Deal[] {
  return deals
}

export function listLPs(): LimitedPartner[] {
  return limitedPartners
}

export function getLpById(id: string): LimitedPartner | undefined {
  return limitedPartners.find((lp) => lp.id === id)
}

export function listLegalDocuments(): LegalDocument[] {
  return [...legalDocuments].sort((a, b) =>
    a.uploadedAt < b.uploadedAt ? 1 : -1,
  )
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
