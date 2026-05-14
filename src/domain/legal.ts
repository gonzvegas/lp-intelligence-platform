import type { LegalInstrumentKind } from './types'

/** UI labels */
export const INSTRUMENT_LABEL: Record<LegalInstrumentKind, string> = {
  lpa: 'LPA',
  side_letter: 'Side letter',
  side_letter_erisa: 'ERISA side letter',
  mfn_election: 'MFN election',
  ima: 'IMA',
  co_invest: 'Co-invest agreement',
}

/**
 * Default conflict precedence (lower = evaluated first / typically overrides broader terms).
 * Organizational policy placeholder — Legal/CCO defines authoritative ordering per fund.
 */
export const DEFAULT_PRECEDENCE_RANK: Record<LegalInstrumentKind, number> = {
  side_letter_erisa: 5,
  side_letter: 15,
  mfn_election: 25,
  co_invest: 35,
  lpa: 45,
  ima: 55,
}

/** Stable ordering for settings UI (highest precedence first). */
export const PRECEDENCE_INSTRUMENT_ORDER: LegalInstrumentKind[] = [
  'side_letter_erisa',
  'side_letter',
  'mfn_election',
  'co_invest',
  'lpa',
  'ima',
]

export const PRECEDENCE_POLICY_NOTE =
  'When an LP has overlapping terms in several documents, screening lists hits in priority order: the document type at the top of the effective list is strongest for sorting and review. Each LP normally follows the fund’s default order; you can override per LP when their negotiated stack differs. Legal still confirms fund and investor-specific rules.'

/** 0-based index used for sorting (lower = higher priority). */
export function precedenceSortIndex(
  instrumentKind: LegalInstrumentKind,
  order: LegalInstrumentKind[],
): number {
  const i = order.indexOf(instrumentKind)
  if (i >= 0) return i
  return 999
}

/** Human label: 1 = strongest. Unknown / missing kinds sort last. */
export function precedencePriorityLabel(sortIndex: number): string {
  if (sortIndex >= 100) return 'Unranked'
  return `Priority ${sortIndex + 1}`
}
