import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { LegalDocument, LegalInstrumentKind, LimitedPartner } from '../../domain/types'
import { INSTRUMENT_LABEL } from '../../domain/legal'
import { Badge, PageHeader } from '../../components/ui'
import { formatDate } from '../../util/format'
import { useAppContext } from '../../context/AppContext'

const KIND_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All instruments' },
  { value: 'lpa', label: 'LPA' },
  { value: 'side_letter', label: 'Side letters' },
  { value: 'side_letter_erisa', label: 'ERISA side letters' },
  { value: 'mfn_election', label: 'MFN elections' },
  { value: 'ima', label: 'IMA' },
  { value: 'co_invest', label: 'Co-invest' },
]

export function InstrumentList() {
  const { fundId } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const kindFilter = searchParams.get('kind') ?? 'all'
  const [docs, setDocs] = useState<LegalDocument[]>([])
  const [lps, setLps] = useState<LimitedPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    setLoading(true)
    ;(async () => {
      const [d, lp] = await Promise.all([
        api.listLegalDocuments(fundId),
        api.listLPs(fundId),
      ])
      if (!m) return
      setDocs(d)
      setLps(lp)
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [fundId])

  const lpName = (id: string | null) =>
    id ? (lps.find((x) => x.id === id)?.name ?? id) : '—'

  const filtered = useMemo(() => {
    if (kindFilter === 'all') return docs
    return docs.filter((d) => d.kind === (kindFilter as LegalInstrumentKind))
  }, [docs, kindFilter])

  return (
    <div>
      <PageHeader
        title="Legal instruments"
        description="LPA, side letters, ERISA letters, MFN elections, IMA, and co-invest agreements — unified catalog with extraction and review states."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-[var(--color-ink-muted)]">
          Filter
          <select
            className="ml-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)]"
            value={kindFilter}
            onChange={(e) => {
              const v = e.target.value
              setSearchParams(
                (prev) => {
                  const n = new URLSearchParams(prev)
                  if (v === 'all') n.delete('kind')
                  else n.set('kind', v)
                  return n
                },
                { replace: true },
              )
            }}
          >
            {KIND_FILTERS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Instrument
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Type
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  LP / scope
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Deal
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Upload
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-[var(--color-surface-muted)]/60">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-[var(--color-accent)] hover:underline"
                      to={`/instruments/${doc.id}`}
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="accent">{INSTRUMENT_LABEL[doc.kind]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {doc.lpId === null ? (
                      <span className="font-medium text-[var(--color-ink)]">
                        Fund-wide
                      </span>
                    ) : (
                      <Link
                        className="text-[var(--color-accent)] hover:underline"
                        to={`/lps/${doc.lpId}`}
                      >
                        {lpName(doc.lpId)}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {doc.dealId ? (
                      <Link
                        className="text-[var(--color-accent)] hover:underline"
                        to={`/deals/${doc.dealId}/screening`}
                      >
                        {doc.dealId}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-ink-muted)]">—</span>
                    )}
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
  status: LegalDocument['reviewStatus']
}) {
  if (status === 'confirmed') return <Badge tone="success">Confirmed</Badge>
  if (status === 'extracted') return <Badge tone="warning">Extracted</Badge>
  return <Badge tone="neutral">Processing</Badge>
}
