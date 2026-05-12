import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type {
  ExtractedRestriction,
  LimitedPartner,
  SideLetterDocument,
} from '../../domain/types'
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui'
import { formatUsd } from '../../util/format'

export function LpDetail() {
  const { lpId } = useParams<{ lpId: string }>()
  const [lp, setLp] = useState<LimitedPartner | null>(null)
  const [letters, setLetters] = useState<SideLetterDocument[]>([])
  const [rest, setRest] = useState<ExtractedRestriction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lpId) return
    let m = true
    ;(async () => {
      const [p, sl, r] = await Promise.all([
        api.getLp(lpId),
        api.listSideLetters(),
        api.restrictionsForLp(lpId),
      ])
      if (!m) return
      setLp(p ?? null)
      setLetters(sl.filter((x) => x.lpId === lpId))
      setRest(r)
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
      <EmptyState
        title="LP not found"
        hint="Return to the directory and select an investor."
      />
    )

  return (
    <div>
      <PageHeader
        title={lp.name}
        description={`${lp.investorType} · commitment ${formatUsd(lp.commitmentUsd)} · funded ${formatUsd(lp.fundedUsd)} (mock)`}
        actions={
          <Link
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
            to={`/capacity/lps/${lp.id}`}
          >
            View capacity ledger
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Commitment & participation (mock)">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-ink-muted)]">Total commitment</dt>
              <dd className="font-medium">{formatUsd(lp.commitmentUsd)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-ink-muted)]">Funded to date</dt>
              <dd className="font-medium">{formatUsd(lp.fundedUsd)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Documents">
          {letters.length === 0 ? (
            <EmptyState title="No documents" hint="Upload a side letter to begin extraction." />
          ) : (
            <ul className="space-y-3">
              {letters.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <Link
                    className="font-medium text-[var(--color-accent)] hover:underline"
                    to={`/side-letters/${doc.id}`}
                  >
                    {doc.title}
                  </Link>
                  <ReviewBadge status={doc.reviewStatus} />
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-dashed border-[var(--color-border)] py-2 text-sm font-medium text-[var(--color-ink-muted)]"
            disabled
          >
            Drag & drop PDF (stub)
          </button>
        </Card>

        <Card title="Active restrictions (catalog)" className="lg:col-span-2">
          {rest.length === 0 ? (
            <EmptyState title="No extracted restrictions yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Severity</th>
                    <th className="pb-2 pr-4 font-medium">Review</th>
                    <th className="pb-2 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {rest.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 capitalize">{r.category}</td>
                      <td className="py-2 pr-4 capitalize">{r.severity}</td>
                      <td className="py-2 pr-4">
                        <Badge tone={r.reviewStatus === 'confirmed' ? 'success' : 'warning'}>
                          {r.reviewStatus}
                        </Badge>
                      </td>
                      <td className="py-2 text-[var(--color-ink-muted)]">{r.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Link className="text-sm font-medium text-[var(--color-accent)] hover:underline" to="/lps">
          ← Back to LPs
        </Link>
      </div>
    </div>
  )
}

function ReviewBadge({
  status,
}: {
  status: SideLetterDocument['reviewStatus']
}) {
  if (status === 'confirmed')
    return <Badge tone="success">Confirmed</Badge>
  if (status === 'extracted')
    return <Badge tone="warning">Extracted — review</Badge>
  return <Badge tone="neutral">Processing</Badge>
}
