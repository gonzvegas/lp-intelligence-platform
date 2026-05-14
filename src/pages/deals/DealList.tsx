import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { Deal } from '../../domain/types'
import { Badge, PageHeader } from '../../components/ui'
import { formatUsd } from '../../util/format'
import { useAppContext } from '../../context/AppContext'

export function DealList() {
  const { fundId } = useAppContext()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    setLoading(true)
    api.listDeals(fundId).then((d) => {
      if (!m) return
      setDeals(d)
      setLoading(false)
    })
    return () => {
      m = false
    }
  }, [fundId])

  return (
    <div>
      <PageHeader
        title="Deal Screening"
        description="Pipeline deals with automated restriction checks against executed LP agreements."
        actions={
          <button
            type="button"
            disabled
            className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Import from DealCloud
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Deal
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Sector / Geo
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Proposed
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Stage
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Screening
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {deals.map((d) => (
                <tr key={d.id} className="hover:bg-[var(--color-surface-muted)]/60">
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                    {d.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {d.sector}
                    <br />
                    <span className="text-xs">{d.geography}</span>
                  </td>
                  <td className="px-4 py-3">{formatUsd(d.proposedAmountUsd)}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{d.pipelineStage}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-[var(--color-accent)] hover:underline"
                      to={`/deals/${d.id}/screening`}
                    >
                      Open matrix
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
