import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { api } from '../../api/client'
import type { Fund, LimitedPartner } from '../../domain/types'
import { Badge, Button, PageHeader } from '../../components/ui'
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

interface CreateLpFormProps {
  funds: Fund[]
  defaultFundId?: string
  onCreated: (lp: LimitedPartner) => void
  onClose: () => void
}

function CreateLpForm({ funds, defaultFundId, onCreated, onClose }: CreateLpFormProps) {
  const [form, setForm] = useState({
    name: '',
    fundId: defaultFundId ?? '',
    entityType: '',
    jurisdiction: '',
    commitmentUsd: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('LP name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const lp = await api.createLP({
        name: form.name.trim(),
        fundId: form.fundId || undefined,
        entityType: form.entityType || undefined,
        jurisdiction: form.jurisdiction || undefined,
        commitmentUsd: form.commitmentUsd ? Number(form.commitmentUsd) : 0,
      })
      onCreated(lp)
    } catch {
      setError('Failed to create LP. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Onboard New LP</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">LP / Investor name *</label>
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
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
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
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">Commitment amount (USD)</label>
            <input
              type="number"
              min={0}
              step={1000000}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              placeholder="e.g. 25000000"
              value={form.commitmentUsd}
              onChange={(e) => set('commitmentUsd', e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Creating…' : 'Add LP'}
            </Button>
            <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]">
              Cancel
            </button>
          </div>

          <p className="text-center text-xs text-[var(--color-ink-muted)]">
            Or sync from DealCloud via{' '}
            <Link to="/settings/integrations" className="text-[var(--color-accent)] hover:underline">
              Settings → Integrations
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export function LpList() {
  const { fundId } = useAppContext()
  const [searchParams] = useSearchParams()
  const queryFundId = searchParams.get('fund') ?? fundId

  const [rows, setRows] = useState<LimitedPartner[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    let m = true
    setLoading(true)
    Promise.all([
      api.listLPs(queryFundId).catch(() => [] as typeof rows),
      api.listFunds().catch(() => [] as typeof funds),
    ]).then(([lps, fs]) => {
      if (!m) return
      setRows(lps)
      setFunds(fs)
      setLoading(false)
    })
    return () => { m = false }
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
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Add LP
          </Button>
        }
      />

      {showCreate && (
        <CreateLpForm
          funds={funds}
          defaultFundId={queryFundId}
          onCreated={(lp) => {
            setRows((r) => [lp, ...r])
            setShowCreate(false)
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
                    <button type="button" onClick={() => setShowCreate(true)} className="text-[var(--color-accent)] hover:underline">
                      Add one manually
                    </button>{' '}
                    or sync from DealCloud.
                  </td>
                </tr>
              ) : filtered.map((lp) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
