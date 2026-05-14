import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react'
import { api } from '../api/client'
import type { Obligation, ObligationKind } from '../domain/types'
import { INSTRUMENT_LABEL } from '../domain/legal'
import { Badge, Button, EmptyState, PageHeader } from '../components/ui'
import { useFlash } from '../components/Flash'
import { PERSONA_LABEL } from '../domain/personas'
import { useAppContext } from '../context/AppContext'
import { formatDate } from '../util/format'
import { cx } from '../util/cx'

const KIND_LABEL: Record<ObligationKind, string> = {
  consent: 'Consent',
  notice: 'Notice',
  reporting: 'Reporting',
  mfn_election_window: 'MFN Window',
  co_invest_allocation: 'Co-invest',
  other: 'Other',
}

const KIND_TONE: Record<ObligationKind, 'neutral' | 'accent' | 'warning' | 'danger'> = {
  consent: 'danger',
  notice: 'neutral',
  reporting: 'accent',
  mfn_election_window: 'warning',
  co_invest_allocation: 'accent',
  other: 'neutral',
}

function urgencyDays(dueAt: string | null): number | null {
  if (!dueAt) return null
  return Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86_400_000)
}

function DueDateCell({ dueAt, status }: { dueAt: string | null; status: Obligation['status'] }) {
  if (!dueAt) return <span className="text-[var(--color-ink-muted)]">—</span>
  const days = urgencyDays(dueAt)
  const isOverdue = status === 'overdue' || (days !== null && days < 0)
  const isUrgent = days !== null && days >= 0 && days <= 7

  return (
    <div className="flex items-center gap-1.5">
      {isOverdue ? (
        <AlertTriangle size={13} className="shrink-0 text-red-500" />
      ) : isUrgent ? (
        <Clock size={13} className="shrink-0 text-amber-500" />
      ) : null}
      <span
        className={cx(
          'text-sm',
          isOverdue
            ? 'font-medium text-red-600'
            : isUrgent
            ? 'font-medium text-amber-700'
            : 'text-[var(--color-ink-muted)]',
        )}
      >
        {formatDate(dueAt)}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: Obligation['status'] }) {
  const map: Record<Obligation['status'], { tone: React.ComponentProps<typeof Badge>['tone']; label: string }> = {
    open: { tone: 'warning', label: 'Open' },
    overdue: { tone: 'danger', label: 'Overdue' },
    done: { tone: 'success', label: 'Complete' },
    waived: { tone: 'neutral', label: 'Waived' },
  }
  const { tone, label } = map[status]
  return <Badge tone={tone}>{label}</Badge>
}

type FilterState = 'open' | 'all' | 'done'
type KindFilter = ObligationKind | 'all'

export function ObligationRegistry() {
  const { persona } = useAppContext()
  const flash = useFlash()
  const [rows, setRows] = useState<Obligation[]>([])
  const [statusFilter, setStatusFilter] = useState<FilterState>('open')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  async function refresh() {
    setRows(await api.listObligations())
  }

  useEffect(() => {
    let m = true
    ;(async () => {
      const data = await api.listObligations()
      if (!m) return
      setRows(data)
      setLoading(false)
    })()
    return () => { m = false }
  }, [])

  const visible = useMemo(() => {
    let r = rows
    if (statusFilter === 'open') r = r.filter((o) => o.status === 'open' || o.status === 'overdue')
    if (statusFilter === 'done') r = r.filter((o) => o.status === 'done' || o.status === 'waived')
    if (kindFilter !== 'all') r = r.filter((o) => o.kind === kindFilter)
    return r.slice().sort((a, b) => {
      const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
      const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
      return da - db
    })
  }, [rows, statusFilter, kindFilter])

  const overdueCount = rows.filter((o) => o.status === 'overdue').length
  const openCount = rows.filter((o) => o.status === 'open').length
  const doneCount = rows.filter((o) => o.status === 'done' || o.status === 'waived').length

  async function markDone(id: string) {
    setCompleting(id)
    try {
      await api.completeObligation(id, PERSONA_LABEL[persona])
      await refresh()
      flash('Obligation marked complete — audit event logged.')
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Obligation registry"
        description="Operating path: consents, notices, MFN windows, ERISA reporting, and co-invest mechanics."
      />

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <button
          onClick={() => setStatusFilter('open')}
          className={cx(
            'rounded-xl border px-4 py-3 text-left transition',
            statusFilter === 'open'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] ring-1 ring-[var(--color-accent)]/20'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
          )}
        >
          <div className="text-xl font-bold text-[var(--color-ink)]">{openCount + overdueCount}</div>
          <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Open & overdue</div>
          {overdueCount > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertTriangle size={11} />
              {overdueCount} overdue
            </div>
          )}
        </button>
        <button
          onClick={() => setStatusFilter('done')}
          className={cx(
            'rounded-xl border px-4 py-3 text-left transition',
            statusFilter === 'done'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] ring-1 ring-[var(--color-accent)]/20'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
          )}
        >
          <div className="text-xl font-bold text-emerald-700">{doneCount}</div>
          <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Completed / waived</div>
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={cx(
            'rounded-xl border px-4 py-3 text-left transition',
            statusFilter === 'all'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] ring-1 ring-[var(--color-accent)]/20'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
          )}
        >
          <div className="text-xl font-bold text-[var(--color-ink)]">{rows.length}</div>
          <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Total obligations</div>
        </button>
      </div>

      {/* Kind filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={13} className="text-[var(--color-ink-muted)]" />
        {(['all', 'consent', 'notice', 'reporting', 'mfn_election_window', 'co_invest_allocation'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={cx(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              kindFilter === k
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)]',
            )}
          >
            {k === 'all' ? 'All types' : KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="No obligations match this filter" hint="Try adjusting the status or kind filter above." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/60">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Obligation</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Owner</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Due</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Links</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {visible.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--color-surface-muted)]/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-ink)]">{o.title}</div>
                    {o.evidenceNote && (
                      <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{o.evidenceNote}</div>
                    )}
                    {o.recurrence && (
                      <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{o.recurrence}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Badge tone={KIND_TONE[o.kind]}>{KIND_LABEL[o.kind]}</Badge>
                      <div>
                        <Badge tone="neutral" className="text-[10px]">{INSTRUMENT_LABEL[o.instrumentKind]}</Badge>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">{o.ownerRole}</td>
                  <td className="px-4 py-3">
                    <DueDateCell dueAt={o.dueAt} status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      <Link
                        to={`/instruments/${o.legalDocumentId}`}
                        className="font-medium text-[var(--color-accent)] hover:underline"
                      >
                        Instrument
                      </Link>
                      {o.lpId && (
                        <Link to={`/lps/${o.lpId}`} className="text-[var(--color-accent)] hover:underline">
                          LP profile
                        </Link>
                      )}
                      {o.dealId && (
                        <Link to={`/deals/${o.dealId}/screening`} className="text-[var(--color-accent)] hover:underline">
                          Deal
                        </Link>
                      )}
                      {!o.lpId && !o.dealId && (
                        <span className="text-[var(--color-ink-muted)]">Fund-wide</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {o.status !== 'done' && o.status !== 'waived' && (
                      <Button
                        variant="secondary"
                        className="whitespace-nowrap text-xs"
                        disabled={completing === o.id}
                        onClick={() => markDone(o.id)}
                      >
                        {completing === o.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                            Saving…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            Mark complete
                          </span>
                        )}
                      </Button>
                    )}
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
