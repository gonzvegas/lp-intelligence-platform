import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { ExtractedRestriction, SideLetterDocument } from '../../domain/types'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { PERSONA_LABEL } from '../../domain/personas'
import { useAppContext } from '../../context/AppContext'
import { formatDate } from '../../util/format'

export function SideLetterDetail() {
  const { id } = useParams<{ id: string }>()
  const { persona } = useAppContext()
  const flash = useFlash()
  const [doc, setDoc] = useState<SideLetterDocument | null>(null)
  const [rest, setRest] = useState<ExtractedRestriction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let m = true
    ;(async () => {
      const [d, allR] = await Promise.all([
        api.getSideLetter(id),
        api.listRestrictions(),
      ])
      if (!m) return
      setDoc(d ?? null)
      setRest(allR.filter((r) => r.sideLetterId === id))
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [id])

  async function confirmRestriction(rid: string) {
    const updated = await api.confirmRestriction(rid, PERSONA_LABEL[persona])
    if (!updated) return
    const allR = await api.listRestrictions()
    setRest(allR.filter((r) => r.sideLetterId === id))
    flash('Restriction confirmed — logged for audit (mock).')
  }

  if (!id) return <EmptyState title="Missing document id" />

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>

  if (!doc)
    return (
      <EmptyState title="Document not found" hint="Choose another side letter from the list." />
    )

  return (
    <div>
      <PageHeader
        title={doc.title}
        description={`Uploaded ${formatDate(doc.uploadedAt)} · extraction states reflect legal review responsibilities.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Document metadata" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[var(--color-ink-muted)]">Review pipeline</dt>
              <dd className="mt-1">
                <StatusBadge status={doc.reviewStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Linked LP</dt>
              <dd className="mt-1">
                <Link
                  className="font-medium text-[var(--color-accent)] hover:underline"
                  to={`/lps/${doc.lpId}`}
                >
                  Open LP profile
                </Link>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-lg border border-dashed border-[var(--color-border)] py-2 text-sm text-[var(--color-ink-muted)]"
          >
            Open source PDF (stub)
          </button>
        </Card>

        <Card title="Extracted restrictions" className="lg:col-span-2">
          {rest.length === 0 ? (
            <EmptyState title="No rows yet" hint="Processing pipeline will populate structured clauses." />
          ) : (
            <ul className="space-y-4">
              {rest.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral" className="capitalize">
                      {r.category}
                    </Badge>
                    <Badge tone={r.severity === 'hard' ? 'danger' : 'warning'}>
                      {r.severity}
                    </Badge>
                    <Badge tone={r.reviewStatus === 'confirmed' ? 'success' : 'warning'}>
                      {r.reviewStatus === 'draft' ? 'Extracted' : 'Confirmed by Compliance'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-[var(--color-ink)]">{r.summary}</p>
                  {r.rawQuote ? (
                    <p className="mt-2 text-xs italic text-[var(--color-ink-muted)]">
                      “{r.rawQuote}”
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={r.reviewStatus === 'confirmed'}
                      onClick={() => confirmRestriction(r.id)}
                    >
                      Mark confirmed (mock)
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Link className="text-sm font-medium text-[var(--color-accent)] hover:underline" to="/side-letters">
          ← Side letters
        </Link>
      </div>
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
