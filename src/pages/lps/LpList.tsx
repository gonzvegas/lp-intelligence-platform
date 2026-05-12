import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { LimitedPartner } from '../../domain/types'
import { Badge, PageHeader } from '../../components/ui'
import { formatUsd } from '../../util/format'

export function LpList() {
  const [rows, setRows] = useState<LimitedPartner[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    api.listLPs().then((data) => {
      if (!m) return
      setRows(data)
      setLoading(false)
    })
    return () => {
      m = false
    }
  }, [])

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
          <button
            type="button"
            className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)]"
            disabled
          >
            Upload side letter (stub)
          </button>
        }
      />

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
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  LP
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Type
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Commitment
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Funded (mock)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((lp) => (
                <tr key={lp.id} className="hover:bg-[var(--color-surface-muted)]/60">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-[var(--color-accent)] hover:underline"
                      to={`/lps/${lp.id}`}
                    >
                      {lp.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {lp.investorType}
                  </td>
                  <td className="px-4 py-3">{formatUsd(lp.commitmentUsd)}</td>
                  <td className="px-4 py-3">
                    {formatUsd(lp.fundedUsd)}{' '}
                    <Badge tone="neutral">
                      {Math.round((lp.fundedUsd / lp.commitmentUsd) * 100)}%
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
