import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,

  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { api } from '../api/client'
import type { Deal, LimitedPartner, Obligation, SignOff } from '../domain/types'
import { Badge, Card } from '../components/ui'
import { formatUsd, formatDate } from '../util/format'
import { cx } from '../util/cx'
import { useAppContext } from '../context/AppContext'

function StatCard({
  label,
  value,
  tone = 'neutral',
  icon: Icon,
  to,
}: {
  label: string
  value: number | string
  tone?: 'neutral' | 'danger' | 'warning' | 'success'
  icon: React.ElementType
  to?: string
}) {
  const toneStyles = {
    neutral: 'text-[var(--color-accent)] bg-[var(--color-accent-muted)]',
    danger: 'text-red-600 bg-red-50 dark:text-red-200 dark:bg-red-950/35',
    warning: 'text-amber-700 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/35',
    success: 'text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/35',
  }

  const content = (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-sm">
      <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', toneStyles[tone])}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">{value}</div>
        <div className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">{label}</div>
      </div>
      {to && <ArrowRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />}
    </div>
  )

  if (to) return <Link to={to} className="block transition hover:opacity-90">{content}</Link>
  return content
}

function urgencyDays(dueAt: string | null): number | null {
  if (!dueAt) return null
  return Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86_400_000)
}

function ObligationRow({ o }: { o: Obligation }) {
  const days = urgencyDays(o.dueAt)
  const isOverdue = o.status === 'overdue' || (days !== null && days < 0)
  const isUrgent = days !== null && days >= 0 && days <= 7

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          to={`/instruments/${o.legalDocumentId}`}
          className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)] hover:underline"
        >
          {o.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <span>{o.ownerRole}</span>
          {o.lpId && (
            <>
              <span>·</span>
              <Link to={`/lps/${o.lpId}`} className="hover:underline">LP profile</Link>
            </>
          )}
          {o.recurrence && (
            <>
              <span>·</span>
              <span>{o.recurrence}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {o.dueAt && (
          <span
            className={cx(
              'text-xs font-medium',
              isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-700' : 'text-[var(--color-ink-muted)]',
            )}
          >
            {isOverdue
              ? `Overdue`
              : days === 0
              ? 'Due today'
              : `Due ${formatDate(o.dueAt)}`}
          </span>
        )}
        <Badge
          tone={
            o.status === 'done'
              ? 'success'
              : o.status === 'overdue' || isOverdue
              ? 'danger'
              : isUrgent
              ? 'warning'
              : 'neutral'
          }
        >
          {o.status}
        </Badge>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { fundId } = useAppContext()
  const [deals, setDeals] = useState<Deal[]>([])
  const [lps, setLps] = useState<LimitedPartner[]>([])
  const [signOffs, setSignOffs] = useState<SignOff[]>([])
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      const [d, lp, so, ob] = await Promise.all([
        api.listDeals(fundId),
        api.listLPs(fundId),
        api.listSignOffs(),
        api.listObligations(),
      ])
      if (!mounted) return
      setDeals(d)
      setLps(lp)
      setSignOffs(so)
      setObligations(ob)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [fundId])

  const icDeals = deals.filter((x) => x.pipelineStage.includes('IC'))
  const pendingSignOffs = signOffs.filter((s) => s.status === 'pending')
  const openObligations = obligations.filter((o) => o.status === 'open' || o.status === 'overdue')
  const overdueObligations = obligations.filter((o) => o.status === 'overdue')
  const urgentObligations = openObligations
    .slice()
    .sort((a, b) => {
      const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
      const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
      return da - db
    })
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
        Loading…
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
          Deal screening, LP obligations, concentration headroom, and compliance sign-offs.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="IC pipeline deals"
          value={icDeals.length}
          icon={TrendingUp}
          tone={icDeals.length > 0 ? 'warning' : 'neutral'}
          to="/deals"
        />
        <StatCard
          label="Pending sign-offs"
          value={pendingSignOffs.length}
          icon={ShieldCheck}
          tone={pendingSignOffs.length > 0 ? 'warning' : 'success'}
          to="/compliance/sign-offs"
        />
        <StatCard
          label="Open obligations"
          value={openObligations.length}
          icon={Clock}
          tone="neutral"
          to="/obligations"
        />
        <StatCard
          label="Overdue items"
          value={overdueObligations.length}
          icon={AlertTriangle}
          tone={overdueObligations.length > 0 ? 'danger' : 'success'}
          to="/obligations"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* IC pipeline */}
        <Card
          title="IC pipeline"
          subtitle="Deals flagged for committee — verify LP eligibility before close."
          className="lg:col-span-2"
          actions={
            <Link to="/deals" className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline">
              All deals <ArrowRight size={14} />
            </Link>
          }
        >
          {icDeals.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-6 text-sm text-[var(--color-ink-muted)]">
              <CheckCircle2 size={16} className="text-emerald-500" />
              No deals in IC-pending stage.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {icDeals.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      className="font-medium text-[var(--color-accent)] hover:underline"
                      to={`/deals/${d.id}/screening`}
                    >
                      {d.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                      {d.sector} · {d.geography} · {formatUsd(d.proposedAmountUsd)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="warning">{d.pipelineStage}</Badge>
                    <Link
                      to={`/deals/${d.id}/screening`}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Screen <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Compliance queue */}
        <Card title="Compliance queue" subtitle="Sign-offs pending CCO review.">
          {pendingSignOffs.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={15} />
              All sign-offs resolved.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {pendingSignOffs.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <Link
                    to="/compliance/sign-offs"
                    className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {s.dealName}
                  </Link>
                  <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{s.assigneeRole}</div>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/compliance/sign-offs"
            className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            Sign-off queue <ArrowRight size={14} />
          </Link>
        </Card>

        {/* Urgent obligations */}
        <Card
          title="Upcoming obligations"
          subtitle="Next 5 open items sorted by due date."
          className="lg:col-span-2"
          actions={
            <Link to="/obligations" className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline">
              Full registry <ArrowRight size={14} />
            </Link>
          }
        >
          {urgentObligations.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={15} />
              No open obligations.
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--color-border)]">
              {urgentObligations.map((o) => (
                <ObligationRow key={o.id} o={o} />
              ))}
            </div>
          )}
        </Card>

        {/* Legal instruments + LP summary */}
        <div className="space-y-4">
          <Card title="Legal instruments" subtitle="Unified catalog of all governing documents.">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-muted)]">Total instruments</span>
                <span className="font-semibold text-[var(--color-ink)]">9</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-muted)]">Confirmed restrictions</span>
                <span className="font-semibold text-emerald-700">5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-muted)]">Draft / needs review</span>
                <span className="font-semibold text-amber-700">2</span>
              </div>
            </div>
            <Link
              to="/instruments"
              className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              Browse instruments <ArrowRight size={14} />
            </Link>
          </Card>

          <Card title="LP roster" subtitle={`${lps.length} limited partners`}>
            <div className="space-y-2">
              {lps.slice(0, 3).map((lp) => (
                <Link
                  key={lp.id}
                  to={`/lps/${lp.id}`}
                  className="flex items-center justify-between text-sm hover:opacity-80"
                >
                  <span className="font-medium text-[var(--color-ink)]">{lp.name}</span>
                  <span className="text-xs text-[var(--color-ink-muted)]">{formatUsd(lp.commitmentUsd)}</span>
                </Link>
              ))}
            </div>
            <Link
              to="/lps"
              className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              LP management <ArrowRight size={14} />
            </Link>
          </Card>
        </div>

        {/* Capacity snapshot */}
        <Card
          title="Capacity snapshot"
          subtitle="Concentration headroom across LP roster."
          className="lg:col-span-3"
          actions={
            <Link to="/capacity" className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline">
              Full overview <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                  <th className="pb-2 pr-4 font-medium">LP</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Commitment</th>
                  <th className="pb-2 pr-4 font-medium">Funded</th>
                  <th className="pb-2 pr-4 font-medium">Concentration cap</th>
                  <th className="pb-2 font-medium">Max new deal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {lps.map((lp) => (
                  <CapacityRow key={lp.id} lp={lp} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

function CapacityRow({ lp }: { lp: LimitedPartner }) {
  const [snap, setSnap] = useState<{
    concentrationLimitPct: number
    maxNewDealUsd: number
  } | null>(null)

  useEffect(() => {
    let m = true
    api.capacitySnapshot(lp.id).then((s) => {
      if (!m || !s) return
      setSnap({ concentrationLimitPct: s.concentrationLimitPct, maxNewDealUsd: s.maxNewDealUsd })
    })
    return () => { m = false }
  }, [lp.id])

  const utilPct = Math.round((lp.fundedUsd / lp.commitmentUsd) * 100)

  return (
    <tr className="hover:bg-[var(--color-surface-muted)]/50">
      <td className="py-2.5 pr-4">
        <Link
          className="font-medium text-[var(--color-accent)] hover:underline"
          to={`/capacity/lps/${lp.id}`}
        >
          {lp.name}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-xs text-[var(--color-ink-muted)]">{lp.investorType}</td>
      <td className="py-2.5 pr-4 text-[var(--color-ink-muted)]">{formatUsd(lp.commitmentUsd)}</td>
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${utilPct}%` }}
            />
          </div>
          <span className="text-xs text-[var(--color-ink-muted)]">{utilPct}%</span>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-[var(--color-ink-muted)]">
        {snap ? `${snap.concentrationLimitPct}%` : '—'}
      </td>
      <td className="py-2.5 font-medium text-[var(--color-ink)]">
        {snap ? formatUsd(snap.maxNewDealUsd) : '—'}
      </td>
    </tr>
  )
}
