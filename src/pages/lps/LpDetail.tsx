import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ChevronDown, ChevronUp, Pencil, Plus, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react'
import { api } from '../../api/client'
import type {
  Allocation,
  ExtractedRestriction,
  LegalDocument,
  LimitedPartner,
  Obligation,
} from '../../domain/types'
import { INSTRUMENT_LABEL } from '../../domain/legal'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { formatUsd } from '../../util/format'

const SECTORS = ['Healthcare', 'Technology', 'Financial Services', 'Industrial', 'Consumer', 'Energy', 'Real Estate', 'Other']

interface AddHoldingFormProps {
  lpId: string
  onAdded: (alloc: Allocation) => void
  onClose: () => void
}

function AddHoldingForm({ lpId, onAdded, onClose }: AddHoldingFormProps) {
  const [form, setForm] = useState({ dealName: '', sector: '', amountUsd: '', closedAt: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.dealName.trim()) { setError('Deal name is required.'); return }
    if (!form.amountUsd) { setError('Amount is required.'); return }
    setSaving(true)
    setError('')
    try {
      const alloc = await api.addAllocationReal(lpId, form.dealName.trim(), form.sector, Number(form.amountUsd), form.closedAt)
      onAdded(alloc)
    } catch {
      setError('Failed to add holding. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Deal / company name *</label>
            <input
              required
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              placeholder="e.g. Portfolio Co A"
              value={form.dealName}
              onChange={(e) => set('dealName', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Sector</label>
            <select
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              value={form.sector}
              onChange={(e) => set('sector', e.target.value)}
            >
              <option value="">Select sector…</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Amount (USD) *</label>
            <input
              required
              type="number"
              min={0}
              step={100000}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              placeholder="e.g. 5000000"
              value={form.amountUsd}
              onChange={(e) => set('amountUsd', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Close date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              value={form.closedAt}
              onChange={(e) => set('closedAt', e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" className="h-8 px-3 text-xs" disabled={saving}>
            {saving ? 'Adding…' : 'Add holding'}
          </Button>
          <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-lg px-2 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]">
            <X size={12} /> Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export function LpDetail() {
  const { lpId } = useParams<{ lpId: string }>()
  const flash = useFlash()
  const [lp, setLp] = useState<LimitedPartner | null>(null)
  const [instruments, setInstruments] = useState<LegalDocument[]>([])
  const [openObligations, setOpenObligations] = useState<Obligation[]>([])
  const [rest, setRest] = useState<ExtractedRestriction[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCommitment, setEditingCommitment] = useState(false)
  const [commitmentDraft, setCommitmentDraft] = useState({ commitmentUsd: 0, fundedUsd: 0 })
  const [savingCommitment, setSavingCommitment] = useState(false)
  const [showAddHolding, setShowAddHolding] = useState(false)
  const [removingAlloc, setRemovingAlloc] = useState<string | null>(null)
  const [reviewingRestriction, setReviewingRestriction] = useState<string | null>(null)
  const [expandedRestriction, setExpandedRestriction] = useState<string | null>(null)
  const [restrictionFilter, setRestrictionFilter] = useState<'all' | 'draft' | 'confirmed' | 'rejected'>('draft')

  useEffect(() => {
    if (!lpId) return
    let m = true
    ;(async () => {
      const [p, docs, r, ob, allocs] = await Promise.all([
        api.getLp(lpId).catch(() => null),
        api.listLegalDocuments().catch(() => []),
        api.restrictionsForLp(lpId).catch(() => []),
        api.listObligations().catch(() => []),
        api.allocationsForLpReal(lpId).catch(() => []),
      ])
      if (!m) return
      setLp(p ?? null)
      setInstruments(
        docs.filter(
          (d) =>
            d.lpId === lpId ||
            (d.lpId === null && ['lpa', 'ima'].includes(d.kind)),
        ),
      )
      setRest(r)
      setOpenObligations(
        ob.filter(
          (o) =>
            (o.lpId === lpId || o.lpId === null) &&
            (o.status === 'open' || o.status === 'overdue'),
        ),
      )
      setAllocations(allocs)
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [lpId])

  async function removeAllocation(allocId: string) {
    setRemovingAlloc(allocId)
    try {
      await api.removeAllocationReal(allocId)
      setAllocations((a) => a.filter((x) => x.id !== allocId))
      flash('Holding removed.')
    } finally {
      setRemovingAlloc(null)
    }
  }

  async function reviewRestriction(id: string, action: 'confirm' | 'reject') {
    setReviewingRestriction(id)
    try {
      const updated = await api.reviewRestriction(id, action)
      if (updated) {
        setRest((prev) => prev.map((r) => r.id === id ? { ...r, reviewStatus: updated.reviewStatus } : r))
        flash(action === 'confirm' ? 'Restriction confirmed — now active in deal screening.' : 'Restriction rejected and hidden from screening.')
      }
    } finally {
      setReviewingRestriction(null)
    }
  }

  async function saveCommitment() {
    if (!lp) return
    setSavingCommitment(true)
    try {
      const updated = await api.updateLP(lp.id, { commitmentUsd: commitmentDraft.commitmentUsd, fundedUsd: commitmentDraft.fundedUsd })
      if (updated) setLp(updated)
      setEditingCommitment(false)
      flash('Commitment updated.')
    } finally {
      setSavingCommitment(false)
    }
  }

  if (!lpId) return <EmptyState title="Missing LP id" />

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>

  if (!lp)
    return (
      <EmptyState
        title="LP not found"
        hint="Return to the directory and select an investor."
      />
    )

  return (
    <div>
      <PageHeader
        title={lp.name}
        description={`${lp.investorType} · Commitment ${formatUsd(lp.commitmentUsd)} · Funded ${formatUsd(lp.fundedUsd)}`}
        actions={
          <Link
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
            to={`/capacity/lps/${lp.id}`}
          >
            View capacity ledger
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Commitment & participation"
          actions={
            !editingCommitment ? (
              <button
                type="button"
                onClick={() => {
                  setCommitmentDraft({ commitmentUsd: lp.commitmentUsd, fundedUsd: lp.fundedUsd })
                  setEditingCommitment(true)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-accent)]"
              >
                <Pencil size={11} /> Edit
              </button>
            ) : undefined
          }
        >
          {editingCommitment ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Total commitment (USD)</label>
                <input
                  type="number"
                  min={0}
                  step={1000000}
                  value={commitmentDraft.commitmentUsd}
                  onChange={(e) => setCommitmentDraft((d) => ({ ...d, commitmentUsd: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Funded to date (USD)</label>
                <input
                  type="number"
                  min={0}
                  step={1000000}
                  value={commitmentDraft.fundedUsd}
                  onChange={(e) => setCommitmentDraft((d) => ({ ...d, fundedUsd: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
              </div>
              {commitmentDraft.fundedUsd > commitmentDraft.commitmentUsd && (
                <p className="text-xs text-amber-600">Funded amount exceeds total commitment.</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="primary"
                  className="h-8 px-3 text-xs"
                  disabled={savingCommitment}
                  onClick={saveCommitment}
                >
                  {savingCommitment ? <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" /> : <Check size={12} />}
                  Save
                </Button>
                <button
                  type="button"
                  onClick={() => setEditingCommitment(false)}
                  className="flex items-center gap-1 rounded-lg px-2 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Total commitment</dt>
                <dd className="font-semibold">{formatUsd(lp.commitmentUsd)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Funded to date</dt>
                <dd className="font-medium">{formatUsd(lp.fundedUsd)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Unfunded</dt>
                <dd className="font-medium">{formatUsd(lp.commitmentUsd - lp.fundedUsd)}</dd>
              </div>
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${Math.min((lp.fundedUsd / lp.commitmentUsd) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {Math.round((lp.fundedUsd / lp.commitmentUsd) * 100)}% funded
                </p>
              </div>
            </dl>
          )}
        </Card>

        <Card title="Open obligations (LP + fund-wide)">
          {openObligations.length === 0 ? (
            <EmptyState title="No open items" hint="Registry tracks consents, notices, MFN windows, ERISA tasks." />
          ) : (
            <ul className="space-y-2 text-sm">
              {openObligations.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link
                    className="font-medium text-[var(--color-accent)] hover:underline"
                    to="/obligations"
                  >
                    {o.title}
                  </Link>
                  <span className="text-[var(--color-ink-muted)]">
                    {' '}
                    · {o.ownerRole}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            className="mt-4 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
            to="/obligations"
          >
            Full obligation registry
          </Link>
        </Card>

        <Card title="Legal instruments" className="lg:col-span-2">
          {instruments.length === 0 ? (
            <EmptyState title="No instruments linked" hint="LPA/IMA apply fund-wide; LP-specific docs attach here." />
          ) : (
            <ul className="space-y-3">
              {instruments.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-medium text-[var(--color-accent)] hover:underline"
                      to={`/instruments/${doc.id}`}
                    >
                      {doc.title}
                    </Link>
                    <Badge tone="accent">{INSTRUMENT_LABEL[doc.kind]}</Badge>
                  </div>
                  <ReviewBadge status={doc.reviewStatus} />
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-dashed border-[var(--color-border)] py-2 text-sm font-medium text-[var(--color-ink-muted)]"
            disabled
          >
            Upload instrument PDF — available after document pipeline
          </button>
        </Card>

        <Card
          title="Holdings & Allocations"
          className="lg:col-span-2"
          actions={
            !showAddHolding ? (
              <button
                type="button"
                onClick={() => setShowAddHolding(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-accent)]"
              >
                <Plus size={11} /> Add holding
              </button>
            ) : undefined
          }
        >
          {showAddHolding && (
            <div className="mb-4">
              <AddHoldingForm
                lpId={lpId!}
                onAdded={(alloc) => {
                  setAllocations((a) => [alloc, ...a])
                  setShowAddHolding(false)
                  flash('Holding added.')
                }}
                onClose={() => setShowAddHolding(false)}
              />
            </div>
          )}

          {allocations.length === 0 && !showAddHolding ? (
            <EmptyState
              title="No holdings yet"
              hint="Add portfolio company investments for this LP, or they'll appear automatically after a DealCloud sync."
            />
          ) : allocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                    <th className="pb-2 pr-4 font-medium">Deal / Company</th>
                    <th className="pb-2 pr-4 font-medium">Sector</th>
                    <th className="pb-2 pr-4 font-medium">Amount (USD)</th>
                    <th className="pb-2 pr-4 font-medium">Close Date</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {allocations.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4 font-medium">{a.dealName}</td>
                      <td className="py-2 pr-4">
                        {a.sector ? <Badge tone="neutral">{a.sector}</Badge> : <span className="text-[var(--color-ink-muted)]">—</span>}
                      </td>
                      <td className="py-2 pr-4">{formatUsd(a.amountUsd)}</td>
                      <td className="py-2 pr-4 text-[var(--color-ink-muted)]">{a.closedAt || '—'}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          disabled={removingAlloc === a.id}
                          onClick={() => removeAllocation(a.id)}
                          className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Remove holding"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card
          title="Extracted restrictions"
          className="lg:col-span-2"
          actions={
            <div className="flex gap-1">
              {(['draft', 'confirmed', 'rejected', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRestrictionFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                    restrictionFilter === f
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]'
                  }`}
                >
                  {f === 'all' ? `All (${rest.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${rest.filter((r) => r.reviewStatus === f).length})`}
                </button>
              ))}
            </div>
          }
        >
          {rest.length === 0 ? (
            <EmptyState title="No extracted restrictions yet" hint="Trigger a DealCloud sync to process LP documents through the AI pipeline." />
          ) : (() => {
            const filtered = restrictionFilter === 'all' ? rest : rest.filter((r) => r.reviewStatus === restrictionFilter)
            if (filtered.length === 0) return (
              <p className="py-4 text-center text-sm text-[var(--color-ink-muted)]">
                No {restrictionFilter} restrictions.
              </p>
            )
            return (
              <div className="divide-y divide-[var(--color-border)]">
                {filtered.map((r) => (
                  <div key={r.id} className={`py-3 ${r.reviewStatus === 'rejected' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                        r.reviewStatus === 'confirmed' ? 'bg-green-500' :
                        r.reviewStatus === 'rejected' ? 'bg-red-300' :
                        'bg-amber-400'
                      }`} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge tone="neutral">{INSTRUMENT_LABEL[r.instrumentKind]}</Badge>
                          <Badge tone="neutral">{r.category}</Badge>
                          <Badge tone={r.severity === 'hard' ? 'danger' : 'warning'}>{r.severity}</Badge>
                          {r.reviewStatus === 'confirmed' && <Badge tone="success">Confirmed — active in screening</Badge>}
                          {r.reviewStatus === 'rejected' && <Badge tone="neutral">Rejected</Badge>}
                          {r.reviewStatus === 'draft' && <Badge tone="warning">Awaiting review</Badge>}
                        </div>

                        <p className="mt-1.5 text-sm text-[var(--color-ink)]">{r.summary}</p>

                        {/* Expandable clause text */}
                        {r.clauseText && (
                          <button
                            type="button"
                            onClick={() => setExpandedRestriction(expandedRestriction === r.id ? null : r.id)}
                            className="mt-1.5 flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                          >
                            {expandedRestriction === r.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {expandedRestriction === r.id ? 'Hide clause text' : 'View clause text'}
                          </button>
                        )}
                        {expandedRestriction === r.id && r.clauseText && (
                          <blockquote className="mt-2 rounded-lg border-l-2 border-[var(--color-accent)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs italic text-[var(--color-ink-muted)]">
                            "{r.clauseText}"
                          </blockquote>
                        )}
                      </div>

                      {/* Review actions */}
                      {r.reviewStatus !== 'confirmed' && (
                        <button
                          type="button"
                          disabled={reviewingRestriction === r.id}
                          onClick={() => reviewRestriction(r.id, 'confirm')}
                          title="Confirm — add to active screening rules"
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-40"
                        >
                          <ThumbsUp size={11} /> Confirm
                        </button>
                      )}
                      {r.reviewStatus !== 'rejected' && (
                        <button
                          type="button"
                          disabled={reviewingRestriction === r.id}
                          onClick={() => reviewRestriction(r.id, 'reject')}
                          title="Reject — Claude misread this, remove from screening"
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <ThumbsDown size={11} /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </Card>
      </div>

      <div className="mt-6">
        <Link className="text-sm font-medium text-[var(--color-accent)] hover:underline" to="/lps">
          ← Back to LPs
        </Link>
      </div>
    </div>
  )
}

function ReviewBadge({
  status,
}: {
  status: LegalDocument['reviewStatus']
}) {
  if (status === 'confirmed') return <Badge tone="success">Confirmed</Badge>
  if (status === 'extracted') return <Badge tone="warning">Extracted</Badge>
  return <Badge tone="neutral">Processing</Badge>
}
