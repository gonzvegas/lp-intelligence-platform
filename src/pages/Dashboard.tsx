import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Deal, LimitedPartner, SignOff } from '../domain/types'
import { Badge, Card } from '../components/ui'
import { formatUsd } from '../util/format'

export function Dashboard() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [lps, setLps] = useState<LimitedPartner[]>([])
  const [signOffs, setSignOffs] = useState<SignOff[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [d, lp, so] = await Promise.all([
        api.listDeals(),
        api.listLPs(),
        api.listSignOffs(),
      ])
      if (!mounted) return
      setDeals(d)
      setLps(lp)
      setSignOffs(so)
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const icDeals = deals.filter((x) => x.pipelineStage.includes('IC'))
  const pendingSignOffs = signOffs.filter((s) => s.status === 'pending')

  const capacityPreview = lps.slice(0, 4)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-ink-muted)]">
          Snapshot of screening workload, concentration headroom, and compliance
          queues before investment committee decisions.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card
            title="Active IC pipeline"
            subtitle="Deals flagged for committee — open screening to verify eligibility."
            className="lg:col-span-2"
          >
            <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {icDeals.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[var(--color-ink-muted)]">
                  No deals in IC-pending stage in mock data.
                </li>
              ) : (
                icDeals.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <Link
                        className="font-medium text-[var(--color-accent)] hover:underline"
                        to={`/deals/${d.id}/screening`}
                      >
                        {d.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        {d.sector} · {d.geography} · proposed{' '}
                        {formatUsd(d.proposedAmountUsd)}
                      </div>
                    </div>
                    <Badge tone="warning">{d.pipelineStage}</Badge>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-4">
              <Link
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                to="/deals"
              >
                View all deals
              </Link>
            </div>
          </Card>

          <Card
            title="Compliance queue"
            subtitle="Sign-offs tied to screening evidence."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-muted)] px-4 py-3">
                <span className="text-sm text-[var(--color-ink-muted)]">
                  Pending sign-offs
                </span>
                <span className="text-2xl font-semibold text-[var(--color-ink)]">
                  {pendingSignOffs.length}
                </span>
              </div>
              <ul className="space-y-2 text-sm">
                {pendingSignOffs.slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <Link
                      className="font-medium text-[var(--color-accent)] hover:underline"
                      to="/compliance/sign-offs"
                    >
                      {s.dealName}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                className="inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
                to="/compliance/sign-offs"
              >
                Open sign-offs
              </Link>
            </div>
          </Card>

          <Card
            title="Capacity snapshot"
            subtitle="Approximate headroom from mock commitments and ledger."
            className="lg:col-span-3"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                    <th className="pb-2 pr-4 font-medium">LP</th>
                    <th className="pb-2 pr-4 font-medium">Commitment</th>
                    <th className="pb-2 pr-4 font-medium">Concentration cap</th>
                    <th className="pb-2 font-medium">Max new single deal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {capacityPreview.map((lp) => (
                    <CapacityRow key={lp.id} lpId={lp.id} name={lp.name} commitment={lp.commitmentUsd} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Link
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                to="/capacity"
              >
                Capacity overview
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function CapacityRow({
  lpId,
  name,
  commitment,
}: {
  lpId: string
  name: string
  commitment: number
}) {
  const [snap, setSnap] = useState<{
    concentrationLimitPct: number
    maxNewDealUsd: number
  } | null>(null)

  useEffect(() => {
    let m = true
    api.capacitySnapshot(lpId).then((s) => {
      if (!m || !s) return
      setSnap({
        concentrationLimitPct: s.concentrationLimitPct,
        maxNewDealUsd: s.maxNewDealUsd,
      })
    })
    return () => {
      m = false
    }
  }, [lpId])

  return (
    <tr>
      <td className="py-2 pr-4">
        <Link
          className="font-medium text-[var(--color-accent)] hover:underline"
          to={`/capacity/lps/${lpId}`}
        >
          {name}
        </Link>
      </td>
      <td className="py-2 pr-4 text-[var(--color-ink-muted)]">
        {formatUsd(commitment)}
      </td>
      <td className="py-2 pr-4 text-[var(--color-ink-muted)]">
        {snap ? `${snap.concentrationLimitPct}%` : '—'}
      </td>
      <td className="py-2 font-medium text-[var(--color-ink)]">
        {snap ? formatUsd(snap.maxNewDealUsd) : '—'}
      </td>
    </tr>
  )
}
