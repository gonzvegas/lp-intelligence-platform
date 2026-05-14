import { useCallback, useState } from 'react'
import { Trash2, Upload, X } from 'lucide-react'
import { api } from '../api/client'
import type { Fund } from '../domain/types'
import { Button } from './ui'
import {
  BULK_LP_IMPORT_HINT,
  type BulkImportMode,
  type BulkLpRow,
  findFundByNameAndVintage,
  parseBulkLpGrid,
  parseCsv,
} from '../util/bulkLpImport'

function normName(s: string): string {
  return s.trim().toLowerCase()
}

export interface BulkImportLpsModalProps {
  mode: BulkImportMode
  /** When mode is `fundScoped`, LPs are created on this fund unless CSV fund column disagrees. */
  fixedFund?: Fund
  funds: Fund[]
  onRefreshFunds: () => Promise<void>
  onSuccess: () => void
  onClose: () => void
}

export function BulkImportLpsModal({
  mode,
  fixedFund,
  funds,
  onRefreshFunds,
  onSuccess,
  onClose,
}: BulkImportLpsModalProps) {
  const [fileText, setFileText] = useState<string | null>(null)
  const [fileLabel, setFileLabel] = useState('')
  const [parseErrors, setParseErrors] = useState<{ line: number; message: string }[]>([])
  const [previewRows, setPreviewRows] = useState<BulkLpRow[]>([])
  const [createMissingFunds, setCreateMissingFunds] = useState(true)
  const [running, setRunning] = useState(false)
  const [runLog, setRunLog] = useState<string[]>([])

  const title =
    mode === 'fundScoped' && fixedFund
      ? `Import LPs — ${fixedFund.name}`
      : 'Bulk import LPs'

  const onPickFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setFileText(null)
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
        setFileText(text)
        const grid = parseCsv(text)
        const { rows, errors } = parseBulkLpGrid(grid, mode)
        setPreviewRows(rows)
        setParseErrors(errors)
      }
      reader.readAsText(file)
    },
    [mode],
  )

  const removePreviewRow = useCallback((lineNumber: number) => {
    setPreviewRows((prev) => prev.filter((r) => r.lineNumber !== lineNumber))
    setRunLog([])
  }, [])

  const canRun =
    previewRows.length > 0 &&
    parseErrors.length === 0 &&
    fileText !== null &&
    !running &&
    (mode === 'platform' || fixedFund !== undefined)

  const executeImport = useCallback(async () => {
    if (!canRun || (mode === 'fundScoped' && !fixedFund)) return
    setRunning(true)
    const log: string[] = []
    let createdLps = 0
    let createdFunds = 0
    let workingFunds = [...funds]

    const recordFund = (f: Fund) => {
      workingFunds = [f, ...workingFunds.filter((x) => x.id !== f.id)]
    }

    for (const row of previewRows) {
      try {
        let fundId: string | null = null

        if (mode === 'fundScoped' && fixedFund) {
          if (row.fundName && normName(row.fundName) !== normName(fixedFund.name)) {
            log.push(
              `Line ${row.lineNumber}: skipped — fund "${row.fundName}" does not match ${fixedFund.name}.`,
            )
            continue
          }
          fundId = fixedFund.id
        } else {
          const found = findFundByNameAndVintage(workingFunds, row.fundName, row.fundVintage)
          if (found) {
            fundId = found.id
          } else {
            const sameName = workingFunds.filter((f) => normName(f.name) === normName(row.fundName))
            if (sameName.length > 1 && !row.fundVintage?.trim()) {
              log.push(
                `Line ${row.lineNumber}: skipped — multiple funds named "${row.fundName}"; add fund_vintage column.`,
              )
              continue
            }
            if (!createMissingFunds) {
              log.push(`Line ${row.lineNumber}: skipped — fund not found: ${row.fundName}.`)
              continue
            }
            const created = await api.createFund({
              name: row.fundName.trim(),
              vintage: row.fundVintage ?? undefined,
            })
            createdFunds++
            recordFund(created)
            fundId = created.id
            await onRefreshFunds()
          }
        }

        if (!fundId) {
          log.push(`Line ${row.lineNumber}: skipped — could not resolve fund.`)
          continue
        }

        const lp = await api.createLP({
          name: row.name,
          fundId,
          entityType: row.entityType ?? undefined,
          commitmentUsd: row.commitmentUsd,
        })
        if (row.fundedUsd > 0) {
          const ok = await api.updateLP(lp.id, { fundedUsd: row.fundedUsd })
          if (!ok) {
            log.push(`Line ${row.lineNumber}: LP created but funded amount could not be set.`)
          }
        }
        createdLps++
      } catch {
        log.push(`Line ${row.lineNumber}: error — import failed for this row.`)
      }
    }

    log.unshift(
      `Done. Created ${createdLps} LP(s)${mode === 'platform' ? `, ${createdFunds} new fund(s).` : '.'}`,
    )
    setRunLog(log)
    setRunning(false)
    if (createdLps > 0 || (mode === 'platform' && createdFunds > 0)) {
      await onRefreshFunds()
      onSuccess()
    }
  }, [
    canRun,
    createMissingFunds,
    fixedFund,
    funds,
    mode,
    onRefreshFunds,
    onSuccess,
    previewRows,
  ])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Upload size={18} className="text-[var(--color-ink-muted)]" />
              {title}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{BULK_LP_IMPORT_HINT}</p>
            {mode === 'fundScoped' && fixedFund ? (
              <p className="mt-2 text-xs text-[var(--color-ink)]">
                All imported LPs are assigned to <strong>{fixedFund.name}</strong>. If the CSV includes a fund
                column, it must match this fund&apos;s name.
              </p>
            ) : null}
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

          {mode === 'platform' ? (
            <label className="mt-4 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 rounded border-[var(--color-border)]"
                checked={createMissingFunds}
                onChange={(e) => setCreateMissingFunds(e.target.checked)}
              />
              <span className="text-sm text-[var(--color-ink)]">
                Create funds that don&apos;t exist yet (matched by name and optional vintage).
              </span>
            </label>
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
                Preview ({previewRows.length} row{previewRows.length === 1 ? '' : 's'}) — remove rows you do
                not want to import.
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-[var(--color-border)]">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
                    <tr>
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Name</th>
                      {mode === 'platform' ? <th className="px-2 py-1.5">Fund</th> : null}
                      {mode === 'fundScoped' && fixedFund ? (
                        <th className="px-2 py-1.5">Assign to</th>
                      ) : null}
                      <th className="px-2 py-1.5">Commitment</th>
                      <th className="px-2 py-1.5">Funded</th>
                      <th className="w-10 px-1 py-1.5" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {previewRows.map((r) => (
                      <tr key={r.lineNumber}>
                        <td className="px-2 py-1.5 text-[var(--color-ink-muted)]">{r.lineNumber}</td>
                        <td className="px-2 py-1.5 font-medium text-[var(--color-ink)]">{r.name}</td>
                        {mode === 'platform' ? (
                          <td className="px-2 py-1.5 text-[var(--color-ink-muted)]">
                            {r.fundName}
                            {r.fundVintage ? ` (${r.fundVintage})` : ''}
                          </td>
                        ) : null}
                        {mode === 'fundScoped' && fixedFund ? (
                          <td className="px-2 py-1.5 text-[var(--color-ink-muted)]">{fixedFund.name}</td>
                        ) : null}
                        <td className="px-2 py-1.5 tabular-nums">{r.commitmentUsd}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.fundedUsd || '—'}</td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-red-50 hover:text-red-600"
                            title="Remove from import"
                            aria-label={`Remove ${r.name} from import`}
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
