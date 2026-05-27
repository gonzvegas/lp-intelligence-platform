import { getEffectiveInstrumentOrder } from './instrumentPrecedenceStorage'
import { precedenceSortIndex } from './legal'
import type {
  Allocation,
  Deal,
  ExtractedRestriction,
  LegalDocument,
  LegalInstrumentKind,
  LimitedPartner,
  ScreeningRestrictionHit,
  ScreeningResult,
  ScreeningRun,
  SectorConcentrationHit,
  SectorConcentrationRule,
} from './types'

export interface ScreeningContext {
  lps: LimitedPartner[]
  restrictions: ExtractedRestriction[]
  allocationsByLp: Record<string, Allocation[]>
  sectorConcentrationRules: SectorConcentrationRule[]
  legalDocuments: LegalDocument[]
  getInstrumentOrder?: (fundId: string, lpId: string) => LegalInstrumentKind[]
}

/** Returns a human-readable conflict reason, or null if the restriction does not apply. */
export function restrictionConflictsDeal(
  r: ExtractedRestriction,
  deal: Deal,
): string | null {
  if (r.reviewStatus === 'rejected') return null

  const s = r.summary.toLowerCase()
  const clause = (r.clauseText ?? r.rawQuote ?? '').toLowerCase()
  const text = `${s} ${clause}`
  const sector = (deal.sector ?? '').toLowerCase()
  const geo = (deal.geography ?? '').toLowerCase()
  const tags = deal.structureTags ?? []
  const esgFlags = deal.esgFlags ?? []

  // ── Structural tags ────────────────────────────────────────────────────────
  if (text.includes('prohibited transaction') && tags.includes('affiliate_sponsor')) {
    return 'ERISA / plan asset analysis may be required (affiliate economics).'
  }
  if (text.includes('advisory committee') && text.includes('affiliate') && tags.includes('affiliate_sponsor')) {
    return 'LPA requires Advisory Committee disclosure for sponsor-affiliate transactions.'
  }

  // ── ERISA (extracted LPAs / side letters) ──────────────────────────────────
  if (r.category === 'erisa' && tags.includes('affiliate_sponsor')) {
    return 'ERISA / plan asset analysis may be required (affiliate or sponsor structure).'
  }

  // ── Sector ─────────────────────────────────────────────────────────────────
  if (r.category === 'sector') {
    if (text.includes('fossil') && (sector.includes('upstream') || sector.includes('midstream') || sector.includes('oil') || sector.includes('gas'))) {
      return 'Fossil fuel / hydrocarbon restriction applies to this sector profile.'
    }
    if (text.includes('gambling') && (sector.includes('gaming') || sector.includes('casino'))) {
      return 'Gaming exposure requires consent workflow per side letter.'
    }
    if (
      sector &&
      (text.includes('investment policy') ||
        text.includes('investment restrictions') ||
        text.includes('investment objectives'))
    ) {
      return 'Deal sector must be verified against LP investment policy and restrictions.'
    }
    if (
      sector &&
      (sector.includes('midstream') || sector.includes('upstream') || sector.includes('power')) &&
      (text.includes('energy') || text.includes('investment'))
    ) {
      return 'Energy sector deal requires verification against LP investment restrictions.'
    }
  }

  // ── Geography ──────────────────────────────────────────────────────────────
  if (r.category === 'geography') {
    if (text.includes('sanction') && geo.includes('iran')) return 'Sanctions geography restriction triggered.'
    if (text.includes('country x') && geo.includes('country x')) return 'Country X prohibition applies.'
    if (geo && (text.includes('target region') || text.includes('list countries'))) {
      return `Geography (${deal.geography}) must be verified against LP target region restrictions.`
    }
  }

  // ── ESG ────────────────────────────────────────────────────────────────────
  if (r.category === 'esg') {
    if (text.includes('thermal coal') && esgFlags.includes('coal_exposure')) {
      return 'Thermal coal ESG restriction applies.'
    }
  }

  // ── Leverage ───────────────────────────────────────────────────────────────
  if (r.category === 'leverage' && deal.leverageMultiple !== undefined) {
    const match = text.match(/(\d+\.?\d*)\s*x/)
    if (match) {
      const cap = parseFloat(match[1])
      if (deal.leverageMultiple > cap) {
        return `Leverage of ${deal.leverageMultiple}x exceeds the ${cap}x cap per side letter.`
      }
    }
  }

  // ── EBITDA minimum ─────────────────────────────────────────────────────────
  if (r.category === 'ebitda' && deal.ebitdaUsd !== undefined) {
    const match = text.match(/\$(\d+(?:\.\d+)?)\s*[mM]/)
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
    if (text.includes('mezzanine') && (dt.includes('mezzanine') || dt.includes('mezz'))) {
      return `Deal type "${deal.dealType}" is restricted — mezzanine/subordinated debt prohibited.`
    }
    if (text.includes('second lien') && dt.includes('second lien')) {
      return `Deal type "${deal.dealType}" is restricted — second lien debt prohibited.`
    }
    if (text.includes('senior secured only') && !dt.includes('first lien') && !dt.includes('unitranche') && !dt.includes('senior secured')) {
      return `Deal type "${deal.dealType}" does not meet senior secured only requirement.`
    }
  }

  // ── Security type ──────────────────────────────────────────────────────────
  if (r.category === 'security_type' && deal.securityType) {
    const st = deal.securityType.toLowerCase()
    if ((text.includes('unsecured') || text.includes('second lien')) && (st.includes('unsecured') || st.includes('second lien'))) {
      return `Security type "${deal.securityType}" requires prior written consent per side letter.`
    }
  }

  // ── Co-invest ──────────────────────────────────────────────────────────────
  if (r.category === 'co_invest' && deal.coInvest) {
    return 'Co-invest structure may require parallel vehicle / co-investment terms review.'
  }

  return null
}

export function sectorConcentrationCheck(
  lp: LimitedPartner,
  deal: Deal,
  rules: SectorConcentrationRule[],
  allocations: Allocation[],
): SectorConcentrationHit[] {
  const lpRules = rules.filter((r) => r.lpId === lp.id)
  const hits: SectorConcentrationHit[] = []

  if (lp.commitmentUsd <= 0) return hits

  for (const rule of lpRules) {
    const pattern = rule.sectorPattern.toLowerCase()
    const matchesDeal = deal.sector.toLowerCase().includes(pattern)
    if (!matchesDeal) continue

    const currentAmount = allocations
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

function resolveInstrumentOrder(
  fundId: string,
  lpId: string,
  getOrder?: ScreeningContext['getInstrumentOrder'],
): LegalInstrumentKind[] {
  return getOrder ? getOrder(fundId, lpId) : getEffectiveInstrumentOrder(fundId, lpId)
}

export function evaluateScreeningForDeal(deal: Deal, ctx: ScreeningContext): ScreeningResult[] {
  const lpsInFund = ctx.lps.filter((lp) => lp.fundId === deal.fundId)
  const docTitleById = Object.fromEntries(ctx.legalDocuments.map((d) => [d.id, d.title]))

  return lpsInFund.map((lp) => {
    const instrumentOrder = resolveInstrumentOrder(deal.fundId, lp.id, ctx.getInstrumentOrder)
    const lpRestrictions = ctx.restrictions.filter(
      (x) => x.lpId === null || x.lpId === lp.id,
    )
    const hits: ScreeningRestrictionHit[] = []

    for (const r of lpRestrictions) {
      const reason = restrictionConflictsDeal(r, deal)
      if (reason) {
        hits.push({
          restrictionId: r.id,
          reason,
          instrumentKind: r.instrumentKind,
          legalDocumentId: r.legalDocumentId,
          instrumentTitle: docTitleById[r.legalDocumentId] ?? r.legalDocumentId,
          precedenceRank: precedenceSortIndex(r.instrumentKind, instrumentOrder),
        })
      }
    }

    hits.sort((a, b) => {
      const d = a.precedenceRank - b.precedenceRank
      if (d !== 0) return d
      return a.restrictionId.localeCompare(b.restrictionId)
    })

    const concentrationHits = sectorConcentrationCheck(
      lp,
      deal,
      ctx.sectorConcentrationRules,
      ctx.allocationsByLp[lp.id] ?? [],
    )

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
  ctx: ScreeningContext,
  runBy: string,
  rulePackVersion = 'rules-2026.05',
): ScreeningRun {
  const results = evaluateScreeningForDeal(deal, ctx)
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
