import type { LegalInstrumentKind } from './types'
import {
  DEFAULT_PRECEDENCE_RANK,
  PRECEDENCE_INSTRUMENT_ORDER,
} from './legal'

/** Ordered instrument list per fund: index 0 = highest priority in screening (fallback when LP has no override). */
const ORDER_KEY = 'lip.instrumentOrderByFund'
/** Per-LP full order — when set, screening uses this instead of the fund list for that LP. */
const LP_ORDER_KEY = 'lip.instrumentOrderByLp'
/** Legacy numeric overrides — migrated once into order list */
const LEGACY_RANK_KEY = 'lip.instrumentPrecedenceByFund'

type OrderByFund = Record<string, LegalInstrumentKind[]>
type OrderByLp = Record<string, LegalInstrumentKind[]>

function readOrderAll(): OrderByFund {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as OrderByFund
    if (!p || typeof p !== 'object') return {}
    const out: OrderByFund = {}
    for (const [fid, arr] of Object.entries(p)) {
      if (!Array.isArray(arr)) continue
      const cleaned = arr.filter((x): x is LegalInstrumentKind =>
        PRECEDENCE_INSTRUMENT_ORDER.includes(x as LegalInstrumentKind),
      )
      if (cleaned.length === PRECEDENCE_INSTRUMENT_ORDER.length) out[fid] = cleaned
    }
    return out
  } catch {
    return {}
  }
}

function writeOrderAll(data: OrderByFund) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(data))
}

function readLpOrderAll(): OrderByLp {
  try {
    const raw = localStorage.getItem(LP_ORDER_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as OrderByLp
    if (!p || typeof p !== 'object') return {}
    const out: OrderByLp = {}
    for (const [lpId, arr] of Object.entries(p)) {
      if (!Array.isArray(arr)) continue
      const cleaned = arr.filter((x): x is LegalInstrumentKind =>
        PRECEDENCE_INSTRUMENT_ORDER.includes(x as LegalInstrumentKind),
      )
      if (cleaned.length === PRECEDENCE_INSTRUMENT_ORDER.length) out[lpId] = cleaned
    }
    return out
  } catch {
    return {}
  }
}

function writeLpOrderAll(data: OrderByLp) {
  localStorage.setItem(LP_ORDER_KEY, JSON.stringify(data))
}

/** One-time migration from numeric rank map to ordered list. */
function migrateLegacyRanksIfNeeded(): void {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_RANK_KEY)
    if (!legacyRaw) return
    const legacy = JSON.parse(legacyRaw) as Record<
      string,
      Partial<Record<LegalInstrumentKind, number>>
    >
    if (!legacy || typeof legacy !== 'object') return

    const existing = readOrderAll()
    let changed = false

    for (const [fundId, overrides] of Object.entries(legacy)) {
      if (existing[fundId]?.length === PRECEDENCE_INSTRUMENT_ORDER.length) continue
      if (!overrides || typeof overrides !== 'object') continue
      const kinds = [...PRECEDENCE_INSTRUMENT_ORDER]
      kinds.sort((a, b) => {
        const ra = overrides[a] ?? DEFAULT_PRECEDENCE_RANK[a]
        const rb = overrides[b] ?? DEFAULT_PRECEDENCE_RANK[b]
        return ra - rb
      })
      existing[fundId] = kinds
      changed = true
    }

    if (changed) {
      writeOrderAll(existing)
      localStorage.removeItem(LEGACY_RANK_KEY)
    }
  } catch {
    /* ignore */
  }
}

/** Full ordered list for screening (highest priority first). */
export function getFundInstrumentOrder(fundId: string): LegalInstrumentKind[] {
  migrateLegacyRanksIfNeeded()
  const all = readOrderAll()
  const custom = all[fundId]
  if (custom?.length === PRECEDENCE_INSTRUMENT_ORDER.length) return custom
  return [...PRECEDENCE_INSTRUMENT_ORDER]
}

export function setFundInstrumentOrder(fundId: string, order: LegalInstrumentKind[]) {
  const uniq = new Set(order)
  if (uniq.size !== PRECEDENCE_INSTRUMENT_ORDER.length) return
  for (const k of PRECEDENCE_INSTRUMENT_ORDER) {
    if (!uniq.has(k)) return
  }
  const all = readOrderAll()
  writeOrderAll({ ...all, [fundId]: [...order] })
}

export function clearFundInstrumentOrder(fundId: string) {
  const all = readOrderAll()
  const { [fundId]: _, ...rest } = all
  writeOrderAll(rest)
}

/** Saved LP-specific order, or null → use fund default. */
export function getLpInstrumentOrderOverride(lpId: string): LegalInstrumentKind[] | null {
  migrateLegacyRanksIfNeeded()
  const all = readLpOrderAll()
  const custom = all[lpId]
  if (custom?.length === PRECEDENCE_INSTRUMENT_ORDER.length) return custom
  return null
}

export function setLpInstrumentOrder(lpId: string, order: LegalInstrumentKind[]) {
  const uniq = new Set(order)
  if (uniq.size !== PRECEDENCE_INSTRUMENT_ORDER.length) return
  for (const k of PRECEDENCE_INSTRUMENT_ORDER) {
    if (!uniq.has(k)) return
  }
  const all = readLpOrderAll()
  writeLpOrderAll({ ...all, [lpId]: [...order] })
}

export function clearLpInstrumentOrder(lpId: string) {
  const all = readLpOrderAll()
  const { [lpId]: _, ...rest } = all
  writeLpOrderAll(rest)
}

/** Order used when screening this LP on a deal in `fundId` (LP override wins). */
export function getEffectiveInstrumentOrder(
  fundId: string,
  lpId: string,
): LegalInstrumentKind[] {
  const lpOrder = getLpInstrumentOrderOverride(lpId)
  if (lpOrder) return lpOrder
  return getFundInstrumentOrder(fundId)
}
