import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Upload, X } from 'lucide-react'
import { api } from '../../api/client'
import type { Fund, LimitedPartner } from '../../domain/types'
import { Badge, Button, PageHeader } from '../../components/ui'
import { BulkImportLpsModal } from '../../components/BulkImportLpsModal'
import { formatUsd } from '../../util/format'
import { useAppContext } from '../../context/AppContext'

const ENTITY_TYPES = [
  'Limited Partnership',
  'Sovereign Wealth Fund',
  'Family Office',
  'Endowment',
  'Foundation',
  'Pension Fund',
  'Insurance Company',
  'Fund of Funds',
  'Other',
]

type AddMode = 'new' | 'existing'

interface CreateLpFormProps {
  funds: Fund[]
  defaultFundId?: string
  onSuccess: () => void
  onClose: () => void
}

function fundLabel(funds: Fund[], fundId: string): string {
  if (!fundId) return 'Unassigned'
  return funds.find((f) => f.id === fundId)?.name ?? fundId
}

function CreateLpForm({ funds, defaultFundId, onSuccess, onClose }: CreateLpFormProps) {
  const [mode, setMode] = useState<AddMode>('new')
  const [form, setForm] = useState({
    name: '',
    fundId: defaultFundId ?? '',
    entityType: '',
    jurisdiction: '',
    commitmentUsd: '',
  })
  const [selectedExistingIds, setSelectedExistingIds] = useState<Set<string>>(() => new Set())
  const [platformLps, setPlatformLps] = useState<LimitedPartner[]>([])
  const [linkSearch, setLinkSearch] = useState('')
  const [loadingLps, setLoadingLps] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  useEffect(() => {
    if (mode !== 'existing') return
    let m = true
    setLoadingLps(true)
    api
      .listLPs()
      .then((all) => {
        if (!m) return
        setPlatformLps(all)
        setLoadingLps(false)
      })
      .catch(() => {
        if (!m) return
        setPlatformLps([])
        setLoadingLps(false)
      })
    return () => {
      m = false
    }
  }, [mode])

  const linkableLps = useMemo(() => {
    const fid = form.fundId
    if (!fid) return platformLps
    return platformLps.filter((lp) => lp.fundId !== fid)
  }, [platformLps, form.fundId])

  const linkableFiltered = useMemo(() => {
    const s = linkSearch.trim().toLowerCase()
    if (!s) return linkableLps
    return linkableLps.filter(
      (lp) =>
        lp.name.toLowerCase().includes(s) ||
        lp.investorType.toLowerCase().includes(s),
    )
  }, [linkableLps, linkSearch])

  function toggleExistingPick(id: string) {
    setSelectedExistingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllLinkableFiltered() {
    setSelectedExistingIds((prev) => {
      const next = new Set(prev)
      for (const lp of linkableFiltered) next.add(lp.id)
      return next
    })
  }

  function clearExistingPicks() {
    setSelectedExistingIds(new Set())
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('LP name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.createLP({
        name: form.name.trim(),
        fundId: form.fundId || undefined,
        entityType: form.entityType || undefined,
        jurisdiction: form.jurisdiction || undefined,
        commitmentUsd: form.commitmentUsd ? Number(form.commitmentUsd) : 0,
      })
      onSuccess()
    } catch {
      setError('Failed to create LP. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function submitExisting(e: React.FormEvent) {
    e.preventDefault()
    if (selectedExistingIds.size === 0) {
      setError('Select at least one investor.')
      return
    }
    if (!form.fundId) {
      setError('Select the fund to assign investors to.')
      return
    }
    setSaving(true)
    setError('')
    try {
      for (const id of selectedExistingIds) {
        const updated = await api.updateLP(id, { fundId: form.fundId })
        if (!updated) {
          setError('Could not update one or more investors.')
          return
        }
      }
      onSuccess()
    } catch {
      setError('Failed to assign investors to fund.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg ${
          mode === 'existing' ? 'max-w-lg' : 'max-w-md'
        } max-h-[90vh] overflow-y-auto p-6`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Add LP</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 flex gap-2 rounded-lg border border-[var(--color-border)] p-1 text-xs font-medium">
          <button
            type="button"
            className={`flex-1 rounded-md px-2 py-2 transition ${
              mode === 'new'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]'
            }`}
            onClick={() => {
              setMode('new')
              setError('')
            }}
          >
            Create new
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-2 py-2 transition ${
              mode === 'existing'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]'
            }`}
            onClick={() => {
              setMode('existing')
              setError('')
              setSelectedExistingIds(new Set())
              setLinkSearch('')
            }}
          >
            Link existing
          </button>
        </div>

        {mode === 'new' ? (
          <form onSubmit={submitNew} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">
                LP / Investor name *
              </label>
              <input
                required
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                placeholder="e.g. State Pension Trust"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Assign to fund</label>
              <select
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                value={form.fundId}
                onChange={(e) => set('fundId', e.target.value)}
              >
                <option value="">No fund assigned</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Investor type</label>
                <select
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  value={form.entityType}
                  onChange={(e) => set('entityType', e.target.value)}
                >
                  <option value="">Select type…</option>
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Jurisdiction</label>
                <input
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  placeholder="e.g. Delaware"
                  value={form.jurisdiction}
                  onChange={(e) => set('jurisdiction', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">
                Commitment amount (USD)
              </label>
              <input
                type="number"
                min={0}
                step="any"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                placeholder="e.g. 25000000"
                value={form.commitmentUsd}
                onChange={(e) => set('commitmentUsd', e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving ? 'Creating…' : 'Create LP'}
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
        ) : (
          <form onSubmit={submitExisting} className="space-y-4">
            <p className="text-xs text-[var(--color-ink-muted)]">
              Choose investors already on the platform and assign them to a fund (they can move from another fund).
              Rows start{' '}
              <span className="font-medium text-[var(--color-ink)]">unchecked</span>; the badge is their{' '}
              <span className="font-medium text-[var(--color-ink)]">current</span> assignment.
            </p>
            <p className="mt-2 text-[10px] text-[var(--color-ink-muted)]">
              To change fund <span className="font-medium text-[var(--color-ink)]">status</span> or other metadata, use{' '}
              <span className="font-medium text-[var(--color-ink)]">Fund Management → Edit</span>.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Assign to fund *</label>
              <select
                required
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                value={form.fundId}
                onChange={(e) => {
                  set('fundId', e.target.value)
                  setSelectedExistingIds(new Set())
                  setLinkSearch('')
                }}
              >
                <option value="">Select fund…</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                <label className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  Existing investors * ({selectedExistingIds.size} selected)
                </label>
                {linkableFiltered.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-[10px] font-medium">
                    <button
                      type="button"
                      className="text-[var(--color-accent)] hover:underline"
                      onClick={selectAllLinkableFiltered}
                    >
                      Select all in list
                    </button>
                    <span className="text-[var(--color-ink-muted)]">·</span>
                    <button
                      type="button"
                      className="text-[var(--color-accent)] hover:underline"
                      onClick={clearExistingPicks}
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>
              <input
                type="search"
                className="mb-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                placeholder="Search investors…"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                aria-label="Filter investors to link"
              />
              {loadingLps ? (
                <p className="text-sm text-[var(--color-ink-muted)]">Loading investors…</p>
              ) : linkableLps.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {form.fundId
                    ? 'No other investors to add — everyone is already on this fund, or the directory is empty.'
                    : 'Select a fund first, or create new LPs.'}
                </p>
              ) : linkableFiltered.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)]">No matches for your search.</p>
              ) : (
                <ul className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-2">
                  {linkableFiltered.map((lp) => (
                    <li
                      key={lp.id}
                      className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--color-surface)]"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-[var(--color-border)]"
                        checked={selectedExistingIds.has(lp.id)}
                        onChange={() => toggleExistingPick(lp.id)}
                        id={`link-lp-${lp.id}`}
                      />
                      <label htmlFor={`link-lp-${lp.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                        <span className="font-medium text-[var(--color-ink)]">{lp.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                          <Badge tone="neutral">{fundLabel(funds, lp.fundId)}</Badge>
                          <span>{lp.investorType}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={
                  saving ||
                  loadingLps ||
                  linkableLps.length === 0 ||
                  !form.fundId ||
                  selectedExistingIds.size === 0
                }
              >
                {saving
                  ? 'Saving…'
                  : selectedExistingIds.size > 1
                    ? `Add ${selectedExistingIds.size} to fund`
                    : 'Add to fund'}
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
        )}

        <p className="mt-4 text-center text-xs text-[var(--color-ink-muted)]">
          Or sync from DealCloud via{' '}
          <Link to="/settings/integrations" className="text-[var(--color-accent)] hover:underline">
            Settings → Integrations
          </Link>
        </p>
      </div>
    </div>
  )
}

export function LpList() {
  const { fundId, funds, refreshFunds } = useAppContext()
  const [searchParams] = useSearchParams()
  const queryFundId = searchParams.get('fund') ?? fundId

  const [rows, setRows] = useState<LimitedPartner[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [addLpModalNonce, setAddLpModalNonce] = useState(0)
  const [showBulkImport, setShowBulkImport] = useState(false)

  function openAddLpModal() {
    setAddLpModalNonce((n) => n + 1)
    setShowCreate(true)
  }

  function reloadLps() {
    const fp = queryFundId || undefined
    setLoadError(null)
    return api
      .listLPs(fp)
      .then(setRows)
      .catch(() => {
        const mocks = import.meta.env.VITE_USE_MOCKS !== 'false'
        const probe = import.meta.env.VITE_API_URL?.trim() || 'http://127.0.0.1:8000'
        const devProxy = import.meta.env.DEV && !import.meta.env.VITE_API_URL?.trim()
        setLoadError(
          mocks
            ? 'Using mock data (VITE_USE_MOCKS is not false). Set VITE_USE_MOCKS=false and restart vite.'
            : devProxy
              ? `Could not reach the API through the dev proxy (/api → ${probe}). Confirm Docker is up, run: curl ${probe}/health — then restart the Vite dev server (npm run dev).`
              : `Could not load LPs (${probe}). Run: docker compose up -d — then curl ${probe}/health`,
        )
      })
  }

  useEffect(() => {
    let m = true
    setLoading(true)
    setLoadError(null)
    const fp = queryFundId || undefined
    api
      .listLPs(fp)
      .then((lps) => {
        if (!m) return
        setRows(lps)
        setLoadError(null)
        setLoading(false)
      })
      .catch(() => {
        if (!m) return
        setRows([])
        const mocks = import.meta.env.VITE_USE_MOCKS !== 'false'
        const probe = import.meta.env.VITE_API_URL?.trim() || 'http://127.0.0.1:8000'
        const devProxy = import.meta.env.DEV && !import.meta.env.VITE_API_URL?.trim()
        setLoadError(
          mocks
            ? 'Using mock data (VITE_USE_MOCKS is not false). Set VITE_USE_MOCKS=false in .env.development and restart vite to load data from Postgres.'
            : devProxy
              ? `Could not reach the API through the dev proxy (/api → ${probe}). Confirm Docker is up, run: curl ${probe}/health — then restart the Vite dev server (npm run dev).`
              : `Could not load LPs from ${probe}. Run: docker compose up -d — then curl ${probe}/health`,
        )
        setLoading(false)
      })
    return () => {
      m = false
    }
  }, [queryFundId])

  const filtered = rows.filter(
    (lp) =>
      lp.name.toLowerCase().includes(q.toLowerCase()) ||
      lp.investorType.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title="LP Management"
        description="Investor profiles, commitments, and linked side letter documents."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowBulkImport(true)}>
              <Upload size={15} /> Import CSV
            </Button>
            <Button variant="primary" onClick={openAddLpModal}>
              <Plus size={15} /> Add LP
            </Button>
          </div>
        }
      />

      {showBulkImport && (
        <BulkImportLpsModal
          mode="platform"
          funds={funds}
          onRefreshFunds={refreshFunds}
          onSuccess={() => void reloadLps()}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {showCreate && (
        <CreateLpForm
          key={addLpModalNonce}
          funds={funds}
          defaultFundId={queryFundId}
          onSuccess={() => {
            setShowCreate(false)
            void reloadLps()
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder="Search by name or investor type…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search limited partners"
        />
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">LP</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Type</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Commitment</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Funded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">
                    No LPs found.{' '}
                    <button
                      type="button"
                      onClick={openAddLpModal}
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      Add one manually
                    </button>{' '}
                    or sync from DealCloud.
                  </td>
                </tr>
              ) : (
                filtered.map((lp) => (
                  <tr key={lp.id} className="hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-4 py-3">
                      <Link
                        className="font-medium text-[var(--color-accent)] hover:underline"
                        to={`/lps/${lp.id}`}
                      >
                        {lp.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-muted)]">{lp.investorType}</td>
                    <td className="px-4 py-3">{formatUsd(lp.commitmentUsd)}</td>
                    <td className="px-4 py-3">
                      {formatUsd(lp.fundedUsd)}{' '}
                      <Badge tone="neutral">
                        {lp.commitmentUsd > 0 ? Math.round((lp.fundedUsd / lp.commitmentUsd) * 100) : 0}%
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
