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

export const PRECEDENCE_POLICY_NOTE =
  'Default instrument precedence: ERISA side letter → side letter → MFN election → co-invest → LPA → IMA. Legal confirms fund-specific ordering.'
