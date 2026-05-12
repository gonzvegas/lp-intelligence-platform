import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { LimitedPartner, SideLetterDocument } from '../../domain/types'
import { Badge, PageHeader } from '../../components/ui'
import { formatDate } from '../../util/format'

export function SideLetterList() {
  const [docs, setDocs] = useState<SideLetterDocument[]>([])
  const [lps, setLps] = useState<LimitedPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    ;(async () => {
      const [d, lp] = await Promise.all([api.listSideLetters(), api.listLPs()])
      if (!m) return
      setDocs(d)
      setLps(lp)
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [])

  const lpName = (id: string) => lps.find((x) => x.id === id)?.name ?? id

  return (
    <div>
      <PageHeader
        title="Side Letter Intelligence"
        description="AI-extracted restrictions with explicit human confirmation states."
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Document
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  LP
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Uploaded
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Pipeline status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-[var(--color-surface-muted)]/60">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-[var(--color-accent)] hover:underline"
                      to={`/side-letters/${doc.id}`}
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-[var(--color-accent)] hover:underline"
                      to={`/lps/${doc.lpId}`}
                    >
                      {lpName(doc.lpId)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.reviewStatus} />
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

function StatusBadge({
  status,
}: {
  status: SideLetterDocument['reviewStatus']
}) {
  if (status === 'confirmed') return <Badge tone="success">Confirmed</Badge>
  if (status === 'extracted') return <Badge tone="warning">Extracted</Badge>
  return <Badge tone="neutral">Processing</Badge>
}
