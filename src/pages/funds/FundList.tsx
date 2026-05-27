import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Pencil, Plus, Users, X } from 'lucide-react'
import { api } from '../../api/client'
import type { Fund, LimitedPartner } from '../../domain/types'
import { Badge, Button, EmptyState, PageHeader } from '../../components/ui'
import { BulkImportLpsModal } from '../../components/BulkImportLpsModal'
import { formatUsd } from '../../util/format'
import { useAppContext } from '../../context/AppContext'

const STRATEGIES = ['Credit', 'Direct Lending', 'Equity', 'Real Assets', 'Fund of Funds', 'Other']
const STATUSES = ['fundraising', 'closed', 'active', 'realized']

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    fundraising: 'bg-blue-50 text-blue-700',
    closed: 'bg-green-50 text-green-700',
    active: 'bg-emerald-50 text-emerald-700',
    realized: 'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] ?? colors.active}`}>
      {status}
    </span>
  )
}

interface CreateFundFormProps {
  onCreated: () => void
  onClose: () => void
}

function CreateFundForm({ onCreated, onClose }: CreateFundFormProps) {
  const [form, setForm] = useState({
    name: '',
    vintage: new Date().getFullYear().toString(),
    strategy: '',
    targetSizeUsd: '',
    currency: 'USD',
    status: 'fundraising',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Fund name is required.'); return }
    setSaving(true)
    setError('')
    try {
      await api.createFund({
        name: form.name.trim(),
        vintage: form.vintage || undefined,
        strategy: form.strategy || undefined,
        targetSizeUsd: form.targetSizeUsd ? Number(form.targetSizeUsd) : undefined,
        currency: form.currency,
        status: form.status,
      })
      onCreated()
    } catch {
      setError('Failed to create fund. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">New Fund</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Fund name *</label>
            <input
              required
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              placeholder="e.g. Comvest Partners VIII"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Vintage year</label>
              <input
                type="number"
                min={2000}
                max={2040}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                value={form.vintage}
                onChange={(e) => set('vintage', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Status</label>
              <select
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Strategy</label>
            <select
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              value={form.strategy}
              onChange={(e) => set('strategy', e.target.value)}
            >
              <option value="">Select strategy…</option>
              {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Target fund size (USD)</label>
            <input
              type="number"
              min={0}
              step="any"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              placeholder="e.g. 500000000"
              value={form.targetSizeUsd}
              onChange={(e) => set('targetSizeUsd', e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Creating…' : 'Create Fund'}
            </Button>
            <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function fundFormDefaults(fund: Fund) {
  return {
    name: fund.name,
    vintage: fund.vintage ?? new Date().getFullYear().toString(),
    strategy: fund.strategy ?? '',
    targetSizeUsd:
      fund.targetSizeUsd != null && fund.targetSizeUsd > 0 ? String(fund.targetSizeUsd) : '',
    currency: fund.currency ?? 'USD',
    status: fund.status ?? 'fundraising',
  }
}

interface EditFundFormProps {
  fund: Fund
  onSaved: () => void
  onClose: () => void
}

function EditFundForm({ fund, onSaved, onClose }: EditFundFormProps) {
  const [form, setForm] = useState(() => fundFormDefaults(fund))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Fund name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await api.updateFund(fund.id, {
        name: form.name.trim(),
        vintage: form.vintage || undefined,
        strategy: form.strategy || undefined,
        targetSizeUsd: form.targetSizeUsd ? Number(form.targetSizeUsd) : null,
        currency: form.currency,
        status: form.status,
      })
      if (!updated) {
        setError('Could not save changes.')
        return
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update fund. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Edit fund</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Fund name *</label>
            <input
              required
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Vintage year</label>
              <input
                type="number"
                min={2000}
                max={2040}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                value={form.vintage}
                onChange={(e) => set('vintage', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Status</label>
              <select
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Strategy</label>
            <select
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              value={form.strategy}
              onChange={(e) => set('strategy', e.target.value)}
            >
              <option value="">Select strategy…</option>
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Target fund size (USD)</label>
            <input
              type="number"
              min={0}
              step="any"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              placeholder="e.g. 500000000"
              value={form.targetSizeUsd}
              onChange={(e) => set('targetSizeUsd', e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ManageFundLpsModal({
  fund,
  allFunds,
  onClose,
  onSaved,
}: {
  fund: Fund
  allFunds: Fund[]
  onClose: () => void
  onSaved: () => void
}) {
  const fundNameById = useMemo(
    () => Object.fromEntries(allFunds.map((f) => [f.id, f.name] as const)),
    [allFunds],
  )

  const [loading, setLoading] = useState(true)
  const [allLps, setAllLps] = useState<LimitedPartner[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let m = true
    setLoading(true)
    api
      .listLPs()
      .then((rows) => {
        if (!m) return
        setAllLps(rows)
        setSelectedIds(new Set(rows.filter((lp) => lp.fundId === fund.id).map((lp) => lp.id)))
        setLoading(false)
      })
      .catch(() => {
        if (!m) return
        setAllLps([])
        setLoading(false)
      })
    return () => {
      m = false
    }
  }, [fund.id])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return allLps
    return allLps.filter(
      (lp) =>
        lp.name.toLowerCase().includes(s) ||
        lp.investorType.toLowerCase().includes(s),
    )
  }, [allLps, q])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const lp of filtered) next.add(lp.id)
      return next
    })
  }

  function removeFundMembersFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const lp of filtered) {
        if (lp.fundId === fund.id) next.delete(lp.id)
      }
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const latest = await api.listLPs()
      for (const lp of latest) {
        const want = selectedIds.has(lp.id)
        const onThisFund = lp.fundId === fund.id
        if (want && !onThisFund) {
          const ok = await api.updateLP(lp.id, { fundId: fund.id })
          if (!ok) throw new Error('assign failed')
        } else if (!want && onThisFund) {
          const ok = await api.updateLP(lp.id, { fundId: '' })
          if (!ok) throw new Error('remove failed')
        }
      }
      onSaved()
    } catch {
      setError('Could not save LP assignments. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function locationLabel(lp: LimitedPartner): string {
    if (!lp.fundId) return 'Unassigned'
    if (lp.fundId === fund.id) return 'On this fund'
    return `Other fund: ${fundNameById[lp.fundId] ?? lp.fundId}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Users size={18} className="text-[var(--color-ink-muted)]" />
              LPs for {fund.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {selectedIds.size} selected · check to add to this fund; uncheck to remove. Checking someone on another fund moves them here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 border-b border-[var(--color-border)] px-5 py-3">
          <input
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            placeholder="Search by name or type…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search limited partners"
          />
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              className="rounded-md border border-[var(--color-border)] px-2 py-1 font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
              onClick={addAllFiltered}
            >
              Select all in list
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--color-border)] px-2 py-1 font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
              onClick={removeFundMembersFiltered}
            >
              Unselect fund LPs in list
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Loading investors…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              {allLps.length === 0
                ? 'No LPs in the platform yet. Add LPs under LP Management first.'
                : 'No matches for your search.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((lp) => (
                <li
                  key={lp.id}
                  className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-[var(--color-border)]"
                    checked={selectedIds.has(lp.id)}
                    onChange={() => toggle(lp.id)}
                    id={`lp-pick-${lp.id}`}
                  />
                  <label htmlFor={`lp-pick-${lp.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <div className="font-medium text-[var(--color-ink)]">{lp.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                      <span>{lp.investorType}</span>
                      <Badge tone="neutral">{locationLabel(lp)}</Badge>
                      <Link
                        to={`/lps/${lp.id}`}
                        className="font-medium text-[var(--color-accent)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Profile →
                      </Link>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4">
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              disabled={saving || loading}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save LP selection'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FundList() {
  const { funds, fundsLoading, refreshFunds } = useAppContext()
  const [showCreate, setShowCreate] = useState(false)
  const [editingFund, setEditingFund] = useState<Fund | null>(null)
  const [managingLpsForFund, setManagingLpsForFund] = useState<Fund | null>(null)
  const [importForFund, setImportForFund] = useState<Fund | null>(null)

  return (
    <div>
      <PageHeader
        title="Fund Management"
        description="Manage funds, LP commitments, and onboard new investors."
        actions={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> New Fund
          </Button>
        }
      />

      {showCreate && (
        <CreateFundForm
          onCreated={() => {
            setShowCreate(false)
            void refreshFunds()
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingFund && (
        <EditFundForm
          fund={editingFund}
          onSaved={() => {
            setEditingFund(null)
            void refreshFunds()
          }}
          onClose={() => setEditingFund(null)}
        />
      )}

      {importForFund && (
        <BulkImportLpsModal
          mode="fundScoped"
          fixedFund={importForFund}
          funds={funds}
          onRefreshFunds={refreshFunds}
          onSuccess={() => void refreshFunds()}
          onClose={() => setImportForFund(null)}
        />
      )}

      {managingLpsForFund && (
        <ManageFundLpsModal
          fund={managingLpsForFund}
          allFunds={funds}
          onClose={() => setManagingLpsForFund(null)}
          onSaved={() => {
            void refreshFunds()
            setManagingLpsForFund(null)
          }}
        />
      )}

      {fundsLoading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : funds.length === 0 ? (
        <EmptyState
          title="No funds yet"
          hint="Create your first fund to start onboarding LPs."
          icon={<Building2 size={28} className="text-[var(--color-ink-muted)]" />}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Fund</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Vintage</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Strategy</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Target Size</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">LPs</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-ink-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {funds.map((fund) => (
                <tr key={fund.id} className="hover:bg-[var(--color-surface-muted)]/60">
                  <td className="px-4 py-3">
                    <Link
                      to={`/lps?fund=${fund.id}`}
                      className="font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {fund.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">{fund.vintage ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">{fund.strategy ?? '—'}</td>
                  <td className="px-4 py-3">
                    {fund.targetSizeUsd ? formatUsd(fund.targetSizeUsd) : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={fund.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <Link
                        to={`/lps?fund=${fund.id}`}
                        className="text-[var(--color-accent)] hover:underline"
                      >
                        View LPs →
                      </Link>
                      <button
                        type="button"
                        onClick={() => setImportForFund(fund)}
                        className="text-left text-xs font-medium text-[var(--color-accent)] hover:underline"
                      >
                        Import CSV…
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagingLpsForFund(fund)}
                        className="text-left text-xs font-medium text-[var(--color-accent)] hover:underline"
                      >
                        Manage LPs…
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingFund(fund)}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      title="Edit fund"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
