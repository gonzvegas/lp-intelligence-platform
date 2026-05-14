import { parseMoneyCell } from './bulkLpImport'

export type HoldingField = 'deal' | 'sector' | 'amount' | 'close_date'

const ALIASES: Record<string, HoldingField> = {
  deal: 'deal',
  deal_name: 'deal',
  company: 'deal',
  investment: 'deal',
  portfolio_company: 'deal',
  name: 'deal',
  sector: 'sector',
  amount: 'amount',
  amount_usd: 'amount',
  commitment: 'amount',
  size: 'amount',
  close_date: 'close_date',
  closed_at: 'close_date',
  close: 'close_date',
  date: 'close_date',
}

export interface BulkHoldingRow {
  lineNumber: number
  dealName: string
  sector: string
  amountUsd: number
  closedAt: string
}

function normalizeHeaderToken(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

export function mapHoldingHeaderToFields(headerRow: string[]): Partial<Record<HoldingField, number>> {
  const out: Partial<Record<HoldingField, number>> = {}
  headerRow.forEach((h, idx) => {
    const field = ALIASES[normalizeHeaderToken(h)]
    if (field !== undefined && out[field] === undefined) out[field] = idx
  })
  return out
}

/** Accept YYYY-MM-DD or common US slashes; empty OK */
function normalizeCloseDate(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const mm = m[1]!.padStart(2, '0')
    const dd = m[2]!.padStart(2, '0')
    const yy = m[3]!
    return `${yy}-${mm}-${dd}`
  }
  return t
}

export function parseBulkHoldingsGrid(grid: string[][]): {
  rows: BulkHoldingRow[]
  errors: { line: number; message: string }[]
} {
  const errors: { line: number; message: string }[] = []
  const rows: BulkHoldingRow[] = []

  if (grid.length < 2) {
    errors.push({ line: 0, message: 'CSV needs a header row and at least one data row.' })
    return { rows, errors }
  }

  const header = grid[0]!
  const col = mapHoldingHeaderToFields(header)

  if (col.deal === undefined) {
    errors.push({
      line: 1,
      message: 'Missing deal column: use deal, deal_name, company, or investment.',
    })
    return { rows, errors }
  }
  if (col.amount === undefined) {
    errors.push({ line: 1, message: 'Missing amount column: use amount, amount_usd, or commitment.' })
    return { rows, errors }
  }

  for (let r = 1; r < grid.length; r++) {
    const lineNumber = r + 1
    const cells = grid[r]!
    const get = (f: HoldingField): string => {
      const idx = col[f]
      if (idx === undefined) return ''
      return cells[idx] ?? ''
    }

    const dealName = get('deal').trim()
    const sector = get('sector').trim()
    const amountUsd = parseMoneyCell(get('amount'))
    const closedAt = normalizeCloseDate(get('close_date'))

    if (!dealName) {
      errors.push({ line: lineNumber, message: 'Deal / company name is empty.' })
      continue
    }

    if (!Number.isFinite(amountUsd) || amountUsd < 0) {
      errors.push({ line: lineNumber, message: 'Invalid amount.' })
      continue
    }

    rows.push({
      lineNumber,
      dealName,
      sector,
      amountUsd,
      closedAt,
    })
  }

  return { rows, errors }
}

export const BULK_HOLDINGS_IMPORT_HINT =
  'Columns: deal (or deal_name, company), amount (or amount_usd), sector (optional), close_date (optional, YYYY-MM-DD).'
