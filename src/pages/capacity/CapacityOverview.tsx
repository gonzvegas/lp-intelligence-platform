import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { CapacitySnapshot, LimitedPartner } from '../../domain/types'
import { Badge, PageHeader } from '../../components/ui'
import { formatUsd } from '../../util/format'

export function CapacityOverview() {
  const [lps, setLps] = useState<LimitedPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    api.listLPs().then((data) => {
      if (!m) return
      setLps(data)
      setLoading(false)
    })
    return () => {
      m = false
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Capacity Management"
        description="Concentration limits from executed side letters versus funded exposure (mock ledger)."
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  LP
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Commitment
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Snapshot
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {lps.map((lp) => (
                <CapacityRow key={lp.id} lp={lp} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CapacityRow({ lp }: { lp: LimitedPartner }) {
  const [snap, setSnap] = useState<CapacitySnapshot | null>(null)

  useEffect(() => {
    let m = true
    api.capacitySnapshot(lp.id).then((s) => {
      if (!m) return
      setSnap(s)
    })
    return () => {
      m = false
    }
  }, [lp.id])

  return (
    <tr className="hover:bg-[var(--color-surface-muted)]/60">
      <td className="px-4 py-3">
        <Link
          className="font-medium text-[var(--color-accent)] hover:underline"
          to={`/capacity/lps/${lp.id}`}
        >
          {lp.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-muted)]">
        {formatUsd(lp.commitmentUsd)}
      </td>
      <td className="px-4 py-3">
        {snap ? (
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Cap {snap.concentrationLimitPct}%</Badge>
            <Badge tone="accent">
              Max new {formatUsd(snap.maxNewDealUsd)}
            </Badge>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Deployed {formatUsd(snap.deployedUsd)}
            </span>
          </div>
        ) : (
          <span className="text-[var(--color-ink-muted)]">—</span>
        )}
      </td>
    </tr>
  )
}
