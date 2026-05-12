import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Allocation, CapacitySnapshot, LimitedPartner } from '../../domain/types'
import { Card, EmptyState, PageHeader } from '../../components/ui'
import { formatUsd } from '../../util/format'

export function LpCapacityDetail() {
  const { lpId } = useParams<{ lpId: string }>()
  const [lp, setLp] = useState<LimitedPartner | null>(null)
  const [snap, setSnap] = useState<CapacitySnapshot | null>(null)
  const [ledger, setLedger] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lpId) return
    let m = true
    ;(async () => {
      const [p, rows] = await Promise.all([
        api.getLp(lpId),
        api.allocationsForLp(lpId),
      ])
      if (!m) return
      setLp(p ?? null)
      setLedger(rows)
      if (p) {
        const s = await api.capacitySnapshot(lpId)
        if (!m) return
        setSnap(s)
      }
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [lpId])

  if (!lpId) return <EmptyState title="Missing LP id" />

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>

  if (!lp)
    return (
      <EmptyState title="LP not found" hint="Return to capacity overview." />
    )

  return (
    <div>
      <PageHeader
        title={`Capacity · ${lp.name}`}
        description="Allocation ledger is illustrative — Phase 2 persists cash flows and denominated commitments."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Headline snapshot">
          {snap ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Commitment</dt>
                <dd className="font-medium">{formatUsd(snap.commitmentUsd)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Deployed (ledger)</dt>
                <dd className="font-medium">{formatUsd(snap.deployedUsd)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Remaining commitment</dt>
                <dd className="font-medium">
                  {formatUsd(snap.remainingCommitmentUsd)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Single-deal cap</dt>
                <dd className="font-medium">{snap.concentrationLimitPct}%</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">
                  Max additional single deal
                </dt>
                <dd className="font-semibold text-[var(--color-accent)]">
                  {formatUsd(snap.maxNewDealUsd)}
                </dd>
              </div>
            </dl>
          ) : (
            <EmptyState title="No snapshot" />
          )}
        </Card>

        <Card title="Concentration rule (mock)" className="lg:col-span-2">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Remaining deployable capacity before closing a new transaction must respect
            both unfunded commitment balance and per-deal concentration language from side
            letters. Replace this panel with governed rule definitions in Phase 2.
          </p>
        </Card>

        <Card title="Allocation ledger" className="lg:col-span-3">
          {ledger.length === 0 ? (
            <EmptyState title="No ledger rows" hint="CSV import will hydrate historical closes." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                    <th className="pb-2 pr-4 font-medium">Deal</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {ledger.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4">{a.dealName}</td>
                      <td className="py-2 pr-4">{formatUsd(a.amountUsd)}</td>
                      <td className="py-2 text-[var(--color-ink-muted)]">{a.closedAt}</td>
                    </tr>
                  ))}
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
