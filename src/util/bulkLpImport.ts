import type { Fund } from '../domain/types'

export type BulkImportMode = 'platform' | 'fundScoped'

export type BulkField = 'name' | 'fund' | 'fund_vintage' | 'commitment' | 'funded' | 'entity_type'

/** Normalized header token → canonical field */
const ALIASES: Record<string, BulkField> = {
  name: 'name',
  lp_name: 'name',
  investor: 'name',
  investor_name: 'name',
  limited_partner: 'name',
  lp: 'name',
  fund: 'fund',
  fund_name: 'fund',
  fundname: 'fund',
  vintage: 'fund_vintage',
  fund_vintage: 'fund_vintage',
  commitment: 'commitment',
  commitment_usd: 'commitment',
  total_commitment: 'commitment',
  funded: 'funded',
  funded_usd: 'funded',
  called: 'funded',
  called_capital: 'funded',
  entity_type: 'entity_type',
  type: 'entity_type',
  investor_type: 'entity_type',
}

export interface BulkLpRow {
  lineNumber: number
  name: string
  fundName: string
  fundVintage: string | null
  commitmentUsd: number
  fundedUsd: number
  entityType: string | null
}

export function parseCsv(text: string): string[][] {
  const result: string[][] = []
  let row: string[] = []
  let cur = ''
  let i = 0
  let inQuotes = false
  const len = text.length

  const flushCell = () => {
    row.push(cur)
    cur = ''
  }

  while (i < len) {
    const c = text[i]!
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cur += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      flushCell()
      i++
      continue
    }
    if (c === '\n') {
      flushCell()
      result.push(row)
      row = []
      i++
      continue
    }
    if (c === '\r') {
      if (i + 1 < len && text[i + 1] === '\n') i++
      flushCell()
      result.push(row)
      row = []
      i++
      continue
    }
    cur += c
    i++
  }
  flushCell()
  if (row.length > 0 && row.some((x) => x.length > 0)) result.push(row)
  return result
}

function normalizeHeaderToken(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

export function mapHeaderToFields(headerRow: string[]): Partial<Record<BulkField, number>> {
  const out: Partial<Record<BulkField, number>> = {}
  headerRow.forEach((h, idx) => {
    const field = ALIASES[normalizeHeaderToken(h)]
    if (field !== undefined && out[field] === undefined) out[field] = idx
  })
  return out
}

export function parseMoneyCell(raw: string): number {
  const t = raw.trim().replace(/[$,\s]/g, '')
  if (!t) return 0
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

function normName(s: string): string {
  return s.trim().toLowerCase()
}

export function findFundByNameAndVintage(funds: Fund[], name: string, vintage: string | null): Fund | undefined {
  const nn = normName(name)
  if (!nn) return undefined
  const candidates = funds.filter((f) => normName(f.name) === nn)
  if (candidates.length === 0) return undefined
  const v = vintage?.trim() ?? ''
  if (v) {
    const vMatch = candidates.filter((f) => String(f.vintage ?? '') === v)
    if (vMatch.length === 1) return vMatch[0]
    if (vMatch.length === 0) return undefined
    return vMatch[0]
  }
  if (candidates.length === 1) return candidates[0]
  return undefined
}

export function parseBulkLpGrid(
  grid: string[][],
  mode: BulkImportMode,
): { rows: BulkLpRow[]; errors: { line: number; message: string }[] } {
  const errors: { line: number; message: string }[] = []
  const rows: BulkLpRow[] = []

  if (grid.length < 2) {
    errors.push({ line: 0, message: 'CSV needs a header row and at least one data row.' })
    return { rows, errors }
  }

  const header = grid[0]!
  const col = mapHeaderToFields(header)

  if (col.name === undefined) {
    errors.push({ line: 1, message: 'Missing required column: name (or lp_name, investor, …).' })
    return { rows, errors }
  }

  if (mode === 'platform' && col.fund === undefined) {
    errors.push({
      line: 1,
      message: 'Missing fund column: add fund (or fund_name) so each LP can be assigned.',
    })
    return { rows, errors }
  }

  for (let r = 1; r < grid.length; r++) {
    const lineNumber = r + 1
    const cells = grid[r]!
    const get = (f: BulkField): string => {
      const idx = col[f]
      if (idx === undefined) return ''
      return cells[idx] ?? ''
    }

    const name = get('name').trim()
    const fundNameRaw = get('fund').trim()
    const vintageRaw = get('fund_vintage').trim()
    const fundVintage = vintageRaw || null

    if (!name) {
      errors.push({ line: lineNumber, message: 'LP name is empty.' })
      continue
    }

    if (mode === 'platform' && !fundNameRaw) {
      errors.push({ line: lineNumber, message: 'Fund name is empty (required for platform import).' })
      continue
    }

    const commitmentUsd = Number.isFinite(parseMoneyCell(get('commitment')))
      ? parseMoneyCell(get('commitment'))
      : NaN
    const fundedRaw = get('funded').trim()
    const fundedUsd = fundedRaw ? parseMoneyCell(fundedRaw) : 0

    if (!Number.isFinite(commitmentUsd) || commitmentUsd < 0) {
      errors.push({ line: lineNumber, message: 'Invalid commitment amount.' })
      continue
    }
    if (fundedRaw && (!Number.isFinite(fundedUsd) || fundedUsd < 0)) {
      errors.push({ line: lineNumber, message: 'Invalid funded / called amount.' })
      continue
    }

    const entityRaw = get('entity_type').trim()
    rows.push({
      lineNumber,
      name,
      fundName: fundNameRaw || '',
      fundVintage,
      commitmentUsd,
      fundedUsd: fundedRaw ? fundedUsd : 0,
      entityType: entityRaw || null,
    })
  }

  return { rows, errors }
}

export const BULK_LP_IMPORT_HINT =
  'Columns: name, fund, fund_vintage (optional), commitment, funded (optional), entity_type (optional). ' +
  'Headers are flexible (e.g. lp_name, fund_name, commitment_usd).'
