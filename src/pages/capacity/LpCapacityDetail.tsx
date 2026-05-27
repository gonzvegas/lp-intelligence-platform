import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Check, CheckCircle2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api } from '../../api/client'
import type {
  Allocation,
  CapacitySnapshot,
  LimitedPartner,
  SectorConcentrationRule,
} from '../../domain/types'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { formatUsd } from '../../util/format'
import { cx } from '../../util/cx'

// Common sectors used as quick-select options
const SECTOR_OPTIONS = [
  'Energy — Midstream',
  'Energy — Power',
  'Energy — Upstream',
  'Healthcare',
  'Industrials',
  'Consumer — Gaming',
  'Consumer — Retail',
  'Consumer — Food & Beverage',
  'Technology — Software',
  'Technology — Hardware',
  'Financial Services',
  'Real Estate',
  'Infrastructure',
  'Other',
]

type SectorRow = { sector: string; amountUsd: number; pct: number }

function SectorBar({
  row,
  rule,
}: {
  row: SectorRow
  rule?: SectorConcentrationRule
}) {
  const atLimit = rule && row.pct >= rule.maxPct
  const nearLimit = rule && row.pct >= rule.maxPct * 0.8

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-[var(--color-ink)] truncate">{row.sector}</span>
          {atLimit && <Badge tone="danger" className="shrink-0 text-[10px]">At limit</Badge>}
          {!atLimit && nearLimit && <Badge tone="warning" className="shrink-0 text-[10px]">Near limit</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)] shrink-0 pl-3">
          <span>{formatUsd(row.amountUsd)}</span>
          <span className={cx(
            'font-semibold tabular-nums w-10 text-right',
            atLimit ? 'text-red-600' : nearLimit ? 'text-amber-700' : 'text-[var(--color-ink)]',
          )}>
            {row.pct}%
          </span>
          {rule
            ? <span className="w-20 text-[var(--color-ink-muted)]">/ {rule.maxPct}% limit</span>
            : <span className="w-20" />
          }
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className={cx(
            'absolute left-0 top-0 h-full rounded-full transition-all duration-500',
            atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-400' : 'bg-[var(--color-accent)]',
          )}
          style={{ width: `${Math.min(row.pct, 100)}%` }}
        />
        {rule && rule.maxPct <= 100 && (
          <div
            className="absolute top-0 h-full w-px bg-red-400/80"
            style={{ left: `${rule.maxPct}%` }}
          />
        )}
      </div>
      {rule && (
        <p className="text-[10px] text-[var(--color-ink-muted)]">{rule.description}</p>
      )}
    </div>
  )
}

const BLANK_FORM = {
  dealName: '',
  sector: '',
  customSector: '',
  amountUsd: '',
  closedAt: new Date().toISOString().split('T')[0],
}

export function LpCapacityDetail() {
  const { lpId } = useParams<{ lpId: string }>()
  const flash = useFlash()
  const [lp, setLp] = useState<LimitedPartner | null>(null)
  const [snap, setSnap] = useState<CapacitySnapshot | null>(null)
  const [ledger, setLedger] = useState<Allocation[]>([])
  const [sectorRows, setSectorRows] = useState<SectorRow[]>([])
  const [concentrationRules, setConcentrationRules] = useState<SectorConcentrationRule[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ dealName: string; sector: string; customSector: string; amountUsd: string; closedAt: string }>({ dealName: '', sector: '', customSector: '', amountUsd: '', closedAt: '' })
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const dealNameRef = useRef<HTMLInputElement>(null)

  async function reload() {
    if (!lpId) return
    const [updatedLp, rows, sectors, rules, snap] = await Promise.all([
      api.getLp(lpId),
      api.allocationsForLp(lpId),
      api.sectorBreakdownForLp(lpId),
      api.listSectorConcentrationRules(lpId),
      api.capacitySnapshot(lpId),
    ])
    if (updatedLp) setLp(updatedLp)
    setLedger(rows)
    setSectorRows(sectors)
    setConcentrationRules(rules)
    setSnap(snap)
  }

  useEffect(() => {
    if (!lpId) return
    let m = true
    ;(async () => {
      const [p, rows, sectors, rules] = await Promise.all([
        api.getLp(lpId),
        api.allocationsForLp(lpId),
        api.sectorBreakdownForLp(lpId),
        api.listSectorConcentrationRules(lpId),
      ])
      if (!m) return
      setLp(p ?? null)
      setLedger(rows)
      setSectorRows(sectors)
      setConcentrationRules(rules)
      if (p) {
        const s = await api.capacitySnapshot(lpId)
        if (!m) return
        setSnap(s)
      }
      setLoading(false)
    })()
    return () => { m = false }
  }, [lpId])

  useEffect(() => {
    if (showForm) setTimeout(() => dealNameRef.current?.focus(), 50)
  }, [showForm])

  async function handleAddHolding(e: React.FormEvent) {
    e.preventDefault()
    if (!lpId) return
    const sector = form.sector === 'Other' ? form.customSector.trim() : form.sector
    if (!form.dealName.trim() || !sector || !form.amountUsd) return
    setSaving(true)
    try {
      await api.addAllocation(lpId, form.dealName.trim(), sector, Number(form.amountUsd), form.closedAt)
      await reload()
      setForm(BLANK_FORM)
      setShowForm(false)
      flash('Holding added and sector exposure updated.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(a: Allocation) {
    const knownSector = SECTOR_OPTIONS.includes(a.sector)
    setEditingId(a.id)
    setEditDraft({
      dealName: a.dealName,
      sector: knownSector ? a.sector : 'Other',
      customSector: knownSector ? '' : a.sector,
      amountUsd: String(a.amountUsd),
      closedAt: a.closedAt,
    })
  }

  async function handleSaveEdit(allocationId: string) {
    const sector = editDraft.sector === 'Other' ? editDraft.customSector.trim() : editDraft.sector
    if (!editDraft.dealName.trim() || !sector || !editDraft.amountUsd) return
    setSavingEditId(allocationId)
    try {
      await api.updateAllocation(allocationId, {
        dealName: editDraft.dealName.trim(),
        sector,
        amountUsd: Number(editDraft.amountUsd),
        closedAt: editDraft.closedAt,
      })
      await reload()
      setEditingId(null)
      flash('Holding updated.')
    } finally {
      setSavingEditId(null)
    }
  }

  async function handleRemove(allocationId: string) {
    setRemovingId(allocationId)
    try {
      await api.removeAllocation(allocationId)
      await reload()
      flash('Holding removed.')
    } finally {
      setRemovingId(null)
    }
  }

  if (!lpId) return <EmptyState title="Missing LP id" />
  if (loading) return (
    <div className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      Loading…
    </div>
  )
  if (!lp) return <EmptyState title="LP not found" hint="Return to capacity overview." />

  const breachedRules = concentrationRules.filter((r) => {
    const row = sectorRows.find((s) => s.sector.toLowerCase().includes(r.sectorPattern.toLowerCase()))
    return row && row.pct >= r.maxPct
  })

  const resolvedSector = form.sector === 'Other' ? form.customSector.trim() : form.sector
  const previewPct = form.amountUsd && snap
    ? Math.round(((Number(form.amountUsd)) / lp.commitmentUsd) * 1000) / 10
    : null

  return (
    <div>
      <PageHeader
        title={`Capacity · ${lp.name}`}
        description="Record holdings, track sector exposure, and monitor concentration limits."
      />

      {breachedRules.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <div className="text-sm font-semibold text-red-800">Concentration limit reached</div>
            <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
              {breachedRules.map((r) => (
                <li key={r.id}>{r.sectorLabel} — at or above {r.maxPct}% limit</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Headline snapshot */}
        <Card title="Headline snapshot">
          {snap ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Total commitment</dt>
                <dd className="font-medium">{formatUsd(lp.commitmentUsd)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Called to date</dt>
                <dd className="font-medium">− {formatUsd(snap.deployedUsd)}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-lg bg-emerald-50 px-2 py-1.5 -mx-2">
                <dt className="font-semibold text-emerald-800">Uncalled (still owed)</dt>
                <dd className="font-bold text-emerald-700">{formatUsd(snap.remainingCommitmentUsd)}</dd>
              </div>
              <p className="text-[10px] text-[var(--color-ink-muted)]">
                Uncalled = Total commitment − Called to date
              </p>
              <div className="h-px bg-[var(--color-border)]" />
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Deployed (ledger)</dt>
                <dd className="font-medium">{formatUsd(snap.deployedUsd)}</dd>
              </div>
              <div className="h-px bg-[var(--color-border)]" />
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Single-deal cap</dt>
                <dd className="font-medium">{snap.concentrationLimitPct}% of commitment</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Max new single deal</dt>
                <dd className="font-semibold text-[var(--color-accent)]">{formatUsd(snap.maxNewDealUsd)}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState title="No snapshot" />
          )}
        </Card>

        {/* Sector exposure — live updating */}
        <Card
          title="Sector exposure"
          subtitle="Holdings as % of total commitment. Bars update as you add new holdings."
          className="lg:col-span-2"
        >
          {sectorRows.length === 0 && concentrationRules.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
              <CheckCircle2 size={15} className="text-emerald-500" />
              No holdings recorded — no sector exposure.
            </div>
          ) : (
            <div className="space-y-5">
              {sectorRows.map((row) => {
                const rule = concentrationRules.find((r) =>
                  row.sector.toLowerCase().includes(r.sectorPattern.toLowerCase())
                )
                return (
                  <SectorBar
                    key={row.sector}
                    row={row}
                    rule={rule}
                  />
                )
              })}

              {/* Rules with no holdings yet */}
              {concentrationRules
                .filter((r) => !sectorRows.some((s) =>
                  s.sector.toLowerCase().includes(r.sectorPattern.toLowerCase())
                ))
                .map((r) => (
                  <div key={r.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--color-ink)]">{r.sectorLabel}</span>
                      <span className="text-xs text-[var(--color-ink-muted)]">0% / {r.maxPct}% limit</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="absolute top-0 h-full w-px bg-red-400/70"
                        style={{ left: `${r.maxPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">{r.description}</p>
                  </div>
                ))
              }
            </div>
          )}
        </Card>

        {/* Add holding form + ledger */}
        <Card
          title="Holdings ledger"
          subtitle="Record closes by deal name, sector, and amount. Sector exposure updates immediately."
          className="lg:col-span-3"
          actions={
            !showForm ? (
              <Button variant="primary" className="h-8 gap-1.5 px-3 text-xs" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Add holding
              </Button>
            ) : undefined
          }
        >
          {/* Inline add form */}
          {showForm && (
            <form onSubmit={handleAddHolding} className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
              <div className="mb-4 text-sm font-semibold text-[var(--color-ink)]">New holding</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Deal / holding name */}
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">
                    Holding / deal name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={dealNameRef}
                    required
                    type="text"
                    placeholder="e.g. Midstream Pipeline TL-B"
                    value={form.dealName}
                    onChange={(e) => setForm((f) => ({ ...f, dealName: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-ink-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                </div>

                {/* Sector */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">
                    Sector <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.sector}
                    onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value, customSector: '' }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  >
                    <option value="">Select sector…</option>
                    {SECTOR_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">
                    Amount (USD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    placeholder="10000000"
                    value={form.amountUsd}
                    onChange={(e) => setForm((f) => ({ ...f, amountUsd: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-ink-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                </div>

                {/* Custom sector (shown only when Other selected) */}
                {form.sector === 'Other' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">
                      Custom sector <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Specialty Chemicals"
                      value={form.customSector}
                      onChange={(e) => setForm((f) => ({ ...f, customSector: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-ink-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                    />
                  </div>
                )}

                {/* Close date */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Close date</label>
                  <input
                    type="date"
                    value={form.closedAt}
                    onChange={(e) => setForm((f) => ({ ...f, closedAt: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                </div>
              </div>

              {/* Live preview */}
              {resolvedSector && previewPct !== null && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-accent-muted)] px-3 py-2 text-xs text-[var(--color-accent)]">
                  <CheckCircle2 size={13} />
                  <span>
                    Adding <strong>{formatUsd(Number(form.amountUsd))}</strong> in <strong>{resolvedSector}</strong> = <strong>{previewPct}% of {lp.name}'s commitment</strong>
                    {(() => {
                      const matchedRule = concentrationRules.find((r) =>
                        resolvedSector.toLowerCase().includes(r.sectorPattern.toLowerCase())
                      )
                      const existingRow = sectorRows.find((s) =>
                        s.sector.toLowerCase().includes(resolvedSector.toLowerCase()) ||
                        resolvedSector.toLowerCase().includes(s.sector.toLowerCase().split(' — ')[0])
                      )
                      if (matchedRule) {
                        const currentPct = existingRow?.pct ?? 0
                        const newTotal = currentPct + previewPct
                        const wouldBreach = newTotal > matchedRule.maxPct
                        return wouldBreach
                          ? <span className="ml-1 font-semibold text-red-600"> — would breach {matchedRule.sectorLabel} {matchedRule.maxPct}% limit ({Math.round(newTotal * 10) / 10}% total)</span>
                          : <span className="ml-1 text-[var(--color-ink-muted)]"> — {matchedRule.sectorLabel} limit: {matchedRule.maxPct}% ({Math.round(newTotal * 10) / 10}% total after add)</span>
                      }
                      return null
                    })()}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="h-8 px-4 text-xs"
                  disabled={saving}
                >
                  {saving
                    ? <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    : <Plus size={13} />
                  }
                  Add holding
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(BLANK_FORM) }}
                  className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Ledger table */}
          {ledger.length === 0 ? (
            <EmptyState
              title="No holdings recorded"
              hint="Use 'Add holding' to record the first allocation close for this LP."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                    <th className="pb-2 pr-4 font-medium">Holding / deal</th>
                    <th className="pb-2 pr-4 font-medium">Sector</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">% of commitment</th>
                    <th className="pb-2 pr-4 font-medium">Close date</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {ledger.map((a) => {
                    const isEditing = editingId === a.id
                    const isSavingEdit = savingEditId === a.id

                    if (isEditing) {
                      return (
                        <tr key={a.id} className="bg-[var(--color-accent-muted)]/30">
                          {/* Deal name */}
                          <td className="py-2 pr-2">
                            <input
                              autoFocus
                              type="text"
                              value={editDraft.dealName}
                              onChange={(e) => setEditDraft((d) => ({ ...d, dealName: e.target.value }))}
                              className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                            />
                          </td>
                          {/* Sector */}
                          <td className="py-2 pr-2">
                            <div className="flex flex-col gap-1">
                              <select
                                value={editDraft.sector}
                                onChange={(e) => setEditDraft((d) => ({ ...d, sector: e.target.value, customSector: '' }))}
                                className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                              >
                                {SECTOR_OPTIONS.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              {editDraft.sector === 'Other' && (
                                <input
                                  type="text"
                                  placeholder="Custom sector…"
                                  value={editDraft.customSector}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, customSector: e.target.value }))}
                                  className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                                />
                              )}
                            </div>
                          </td>
                          {/* Amount */}
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min={1}
                              value={editDraft.amountUsd}
                              onChange={(e) => setEditDraft((d) => ({ ...d, amountUsd: e.target.value }))}
                              className="w-32 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                            />
                          </td>
                          {/* % — computed preview */}
                          <td className="py-2 pr-2 text-xs tabular-nums text-[var(--color-ink-muted)]">
                            {snap && editDraft.amountUsd
                              ? `${Math.round((Number(editDraft.amountUsd) / snap.commitmentUsd) * 1000) / 10}%`
                              : '—'}
                          </td>
                          {/* Close date */}
                          <td className="py-2 pr-2">
                            <input
                              type="date"
                              value={editDraft.closedAt}
                              onChange={(e) => setEditDraft((d) => ({ ...d, closedAt: e.target.value }))}
                              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                            />
                          </td>
                          {/* Actions */}
                          <td className="py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isSavingEdit}
                                onClick={() => handleSaveEdit(a.id)}
                                className="flex items-center gap-1 rounded-md bg-[var(--color-accent)] px-2 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                              >
                                {isSavingEdit
                                  ? <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                                  : <Check size={11} />
                                }
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
                              >
                                <X size={11} /> Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={a.id} className="group hover:bg-[var(--color-surface-muted)]/40">
                        <td className="py-2.5 pr-4 font-medium text-[var(--color-ink)]">{a.dealName}</td>
                        <td className="py-2.5 pr-4">
                          <Badge tone="neutral">{a.sector}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">{formatUsd(a.amountUsd)}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-[var(--color-ink-muted)]">
                          {snap ? `${Math.round((a.amountUsd / snap.commitmentUsd) * 1000) / 10}%` : '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-[var(--color-ink-muted)]">{a.closedAt}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => startEdit(a)}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)]"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button
                              type="button"
                              disabled={removingId === a.id}
                              onClick={() => handleRemove(a.id)}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-ink-muted)] hover:bg-red-50 hover:text-red-600 disabled:cursor-wait"
                            >
                              {removingId === a.id
                                ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                                : <Trash2 size={11} />
                              }
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link className="text-sm font-medium text-[var(--color-accent)] hover:underline" to="/capacity">
          ← Capacity overview
        </Link>
        <Link className="text-sm font-medium text-[var(--color-accent)] hover:underline" to={`/lps/${lp.id}`}>
          LP profile
        </Link>
      </div>
    </div>
  )
}
