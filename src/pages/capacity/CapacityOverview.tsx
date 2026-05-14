import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { CapacitySnapshot, LimitedPartner } from '../../domain/types'
import { PageHeader } from '../../components/ui'
import { useAppContext } from '../../context/AppContext'
import { formatUsd } from '../../util/format'
import { cx } from '../../util/cx'

type RowData = { lp: LimitedPartner; snap: CapacitySnapshot | null }

export function CapacityOverview() {
  const { fundId } = useAppContext()
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    setLoading(true)
    ;(async () => {
      const lps = await api.listLPs(fundId)
      if (!m) return
      const snaps = await Promise.all(lps.map((lp) => api.capacitySnapshot(lp.id)))
      if (!m) return
      setRows(lps.map((lp, i) => ({ lp, snap: snaps[i] })))
      setLoading(false)
    })()
    return () => { m = false }
  }, [fundId])

  const totalCommitment = rows.reduce((s, r) => s + r.lp.commitmentUsd, 0)
  const totalCalled = rows.reduce((s, r) => s + r.lp.fundedUsd, 0)
  const totalUncalled = rows.reduce((s, r) => s + (r.snap?.remainingCommitmentUsd ?? (r.lp.commitmentUsd - r.lp.fundedUsd)), 0)
  const calledPct = totalCommitment > 0 ? Math.round((totalCalled / totalCommitment) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Capacity Management"
        description="Total committed capital versus deployed exposure for LPs in the selected fund."
      />

      {/* Top-level stat strip */}
      {!loading && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total commitments"
            value={formatUsd(totalCommitment)}
            sub="Capital pledged by LPs in this fund"
          />
          <StatCard
            label="Called capital"
            value={formatUsd(totalCalled)}
            sub={`${calledPct}% of commitments drawn to date`}
            bar={{ pct: calledPct, tone: 'accent' }}
          />
          <StatCard
            label="Uncalled commitment"
            value={formatUsd(totalUncalled)}
            sub="Pledged but not yet drawn — GP can still call this"
            highlight
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
          Loading…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">LP</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Total commitment</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Called</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    Uncalled (still owed)
                  </span>
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Called %</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Single-deal cap</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map(({ lp, snap }) => {
                    const called = lp.fundedUsd
                    const uncalled = snap?.remainingCommitmentUsd ?? (lp.commitmentUsd - called)
                    const pct = lp.commitmentUsd > 0 ? Math.round((called / lp.commitmentUsd) * 100) : 0

                return (
                  <tr key={lp.id} className="hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-[var(--color-accent)] hover:underline"
                        to={`/capacity/lps/${lp.id}`}
                      >
                        {lp.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--color-ink-muted)]">
                      {formatUsd(lp.commitmentUsd)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--color-ink-muted)]">
                      {formatUsd(called)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold tabular-nums text-emerald-700">
                        {formatUsd(uncalled)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-border)]">
                          <div
                            className={cx(
                              'h-full rounded-full',
                              pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-[var(--color-accent)]',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-[var(--color-ink-muted)]">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {snap ? (
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          Max {formatUsd(snap.maxNewDealUsd)} ({snap.concentrationLimitPct}% cap)
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/capacity/lps/${lp.id}`}
                        className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals footer */}
            <tfoot className="border-t-2 border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Total</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{formatUsd(totalCommitment)}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{formatUsd(totalCalled)}</td>
                <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700">{formatUsd(totalUncalled)}</td>
                <td className="px-4 py-3" colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  bar,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  bar?: { pct: number; tone: 'accent' | 'success' }
  highlight?: boolean
}) {
  return (
    <div className={cx(
      'rounded-xl border px-5 py-4',
      highlight
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-[var(--color-border)] bg-[var(--color-surface)]',
    )}>
      <div className={cx('mb-1 text-xs font-medium uppercase tracking-wide', highlight ? 'text-emerald-700' : 'text-[var(--color-ink-muted)]')}>
        {label}
      </div>
      <div className={cx('text-2xl font-bold tabular-nums', highlight ? 'text-emerald-800' : 'text-[var(--color-ink)]')}>
        {value}
      </div>
      {sub && (
        <div className={cx('mt-1 text-xs', highlight ? 'text-emerald-600' : 'text-[var(--color-ink-muted)]')}>{sub}</div>
      )}
      {bar && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)]"
            style={{ width: `${bar.pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
