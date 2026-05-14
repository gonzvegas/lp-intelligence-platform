import { useCallback, useState } from 'react'
import { Trash2, Upload, X } from 'lucide-react'
import { api } from '../api/client'
import type { Allocation } from '../domain/types'
import { Button } from './ui'
import {
  BULK_HOLDINGS_IMPORT_HINT,
  type BulkHoldingRow,
  parseBulkHoldingsGrid,
} from '../util/bulkHoldingsImport'
import { parseCsv } from '../util/bulkLpImport'

export interface BulkImportHoldingsModalProps {
  lpId: string
  lpName?: string
  onImported: (allocations: Allocation[]) => void
  onClose: () => void
}

export function BulkImportHoldingsModal({
  lpId,
  lpName,
  onImported,
  onClose,
}: BulkImportHoldingsModalProps) {
  const [fileLabel, setFileLabel] = useState('')
  const [parseErrors, setParseErrors] = useState<{ line: number; message: string }[]>([])
  const [previewRows, setPreviewRows] = useState<BulkHoldingRow[]>([])
  const [running, setRunning] = useState(false)
  const [runLog, setRunLog] = useState<string[]>([])

  const onPickFile = useCallback((file: File | null) => {
    if (!file) {
      setFileLabel('')
      setPreviewRows([])
      setParseErrors([])
      setRunLog([])
      return
    }
    setFileLabel(file.name)
    setRunLog([])
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const grid = parseCsv(text)
      const { rows, errors } = parseBulkHoldingsGrid(grid)
      setPreviewRows(rows)
      setParseErrors(errors)
    }
    reader.readAsText(file)
  }, [])

  const removePreviewRow = useCallback((lineNumber: number) => {
    setPreviewRows((prev) => prev.filter((r) => r.lineNumber !== lineNumber))
    setRunLog([])
  }, [])

  const canRun = previewRows.length > 0 && parseErrors.length === 0 && !running

  const executeImport = useCallback(async () => {
    if (!canRun) return
    setRunning(true)
    const log: string[] = []
    const created: Allocation[] = []
    for (const row of previewRows) {
      try {
        const a = await api.addAllocationReal(lpId, row.dealName, row.sector, row.amountUsd, row.closedAt)
        created.push(a)
      } catch {
        log.push(`Line ${row.lineNumber}: failed — could not add holding.`)
      }
    }
    log.unshift(`Done. Imported ${created.length} holding(s).`)
    setRunLog(log)
    setRunning(false)
    if (created.length > 0) {
      onImported(created)
    }
  }, [canRun, lpId, onImported, previewRows])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Upload size={18} className="text-[var(--color-ink-muted)]" />
              Import holdings{lpName ? ` — ${lpName}` : ''}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{BULK_HOLDINGS_IMPORT_HINT}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-[var(--color-ink-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--color-border)] file:bg-[var(--color-surface-muted)] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[var(--color-ink)]"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {fileLabel ? (
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Loaded: {fileLabel}</p>
          ) : null}

          {parseErrors.length > 0 ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <p className="font-medium">Fix CSV and re-upload</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {parseErrors.map((e, i) => (
                  <li key={i}>
                    {e.line > 0 ? `Line ${e.line}: ` : ''}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {previewRows.length > 0 && parseErrors.length === 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-[var(--color-ink-muted)]">
                Preview ({previewRows.length} row{previewRows.length === 1 ? '' : 's'}) — remove rows you do not
                want to import.
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-[var(--color-border)]">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
                    <tr>
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Deal</th>
                      <th className="px-2 py-1.5">Sector</th>
                      <th className="px-2 py-1.5">Amount</th>
                      <th className="px-2 py-1.5">Close</th>
                      <th className="w-10 px-1 py-1.5" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {previewRows.map((r) => (
                      <tr key={r.lineNumber}>
                        <td className="px-2 py-1.5 text-[var(--color-ink-muted)]">{r.lineNumber}</td>
                        <td className="px-2 py-1.5 font-medium text-[var(--color-ink)]">{r.dealName}</td>
                        <td className="px-2 py-1.5 text-[var(--color-ink-muted)]">{r.sector || '—'}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.amountUsd}</td>
                        <td className="px-2 py-1.5 text-[var(--color-ink-muted)]">{r.closedAt || '—'}</td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-red-50 hover:text-red-600"
                            title="Remove from import"
                            aria-label={`Remove ${r.dealName} from import`}
                            onClick={() => removePreviewRow(r.lineNumber)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {runLog.length > 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3 py-2 text-xs text-[var(--color-ink)]">
              <p className="font-medium text-[var(--color-ink-muted)]">Result</p>
              <ul className="mt-1 max-h-36 overflow-y-auto space-y-0.5 font-mono">
                {runLog.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={!canRun}
            onClick={() => void executeImport()}
          >
            {running ? 'Importing…' : 'Run import'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
