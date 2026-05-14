import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Plus, X } from 'lucide-react'
import { api } from '../../api/client'
import type { Fund } from '../../domain/types'
import { Button, EmptyState, PageHeader } from '../../components/ui'
import { formatUsd } from '../../util/format'

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
  onCreated: (fund: Fund) => void
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
      const fund = await api.createFund({
        name: form.name.trim(),
        vintage: form.vintage || undefined,
        strategy: form.strategy || undefined,
        targetSizeUsd: form.targetSizeUsd ? Number(form.targetSizeUsd) : undefined,
        currency: form.currency,
        status: form.status,
      })
      onCreated(fund)
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
              step={1000000}
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

export function FundList() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    api.listFunds()
      .then((data) => setFunds(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
          onCreated={(fund) => {
            setFunds((f) => [fund, ...f])
            setShowCreate(false)
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {loading ? (
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
                    <Link
                      to={`/lps?fund=${fund.id}`}
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      View LPs →
                    </Link>
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
