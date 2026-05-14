import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, FileText } from 'lucide-react'
import { api } from '../../api/client'
import type {
  ExtractedRestriction,
  LegalDocument,
  Obligation,
} from '../../domain/types'
import {
  INSTRUMENT_LABEL,
  PRECEDENCE_POLICY_NOTE,
} from '../../domain/legal'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { PERSONA_LABEL } from '../../domain/personas'
import { can } from '../../domain/access'
import { useAppContext } from '../../context/AppContext'
import { formatDate } from '../../util/format'

export function InstrumentDetail() {
  const { id } = useParams<{ id: string }>()
  const { persona } = useAppContext()
  const flash = useFlash()
  const canConfirm = can(persona, 'action:confirm_restriction')
  const [doc, setDoc] = useState<LegalDocument | null>(null)
  const [rest, setRest] = useState<ExtractedRestriction[]>([])
  const [obls, setObls] = useState<Obligation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let m = true
    ;(async () => {
      const [d, allR, allO] = await Promise.all([
        api.getLegalDocument(id),
        api.listRestrictions(),
        api.listObligations(),
      ])
      if (!m) return
      setDoc(d ?? null)
      setRest(allR.filter((r) => r.legalDocumentId === id))
      setObls(allO.filter((o) => o.legalDocumentId === id))
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
    setRest(allR.filter((r) => r.legalDocumentId === id))
    flash('Restriction confirmed — logged for audit.')
  }

  if (!id) return <EmptyState title="Missing document id" />

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>

  if (!doc)
    return (
      <EmptyState
        title="Instrument not found"
        hint="Choose another document from the catalog."
      />
    )

  return (
    <div>
      <PageHeader
        title={doc.title}
        description={`${INSTRUMENT_LABEL[doc.kind]} · uploaded ${formatDate(doc.uploadedAt)} · structured clauses split into screening facts and operating obligations.`}
      />

      <Card title="Precedence policy (organizational default)" className="mb-6">
        <p className="text-sm text-[var(--color-ink-muted)]">{PRECEDENCE_POLICY_NOTE}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Instrument metadata" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[var(--color-ink-muted)]">Type</dt>
              <dd className="mt-1">
                <Badge tone="accent">{INSTRUMENT_LABEL[doc.kind]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Review pipeline</dt>
              <dd className="mt-1">
                <DocStatusBadge status={doc.reviewStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">LP scope</dt>
              <dd className="mt-1">
                {doc.lpId === null ? (
                  <span className="font-medium">Fund-wide</span>
                ) : (
                  <Link
                    className="font-medium text-[var(--color-accent)] hover:underline"
                    to={`/lps/${doc.lpId}`}
                  >
                    Open LP profile
                  </Link>
                )}
              </dd>
            </div>
            {doc.dealId ? (
              <div>
                <dt className="text-[var(--color-ink-muted)]">Linked deal</dt>
                <dd className="mt-1">
                  <Link
                    className="font-medium text-[var(--color-accent)] hover:underline"
                    to={`/deals/${doc.dealId}/screening`}
                  >
                    Open deal screening
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
          <button
            type="button"
            disabled
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] py-2 text-sm text-[var(--color-ink-muted)]"
          >
            <FileText size={14} />
            Source PDF — available after document pipeline
          </button>
        </Card>

        <Card title="Screening facts (restrictions)" className="lg:col-span-2">
          {rest.length === 0 ? (
            <EmptyState
              title="No restriction rows"
              hint="Many obligations-only instruments (MFN, co-invest admin) may still drive tasks below."
            />
          ) : (
            <ul className="space-y-4">
              {rest.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral" className="font-mono text-[10px]">
                      rank {r.precedenceRank}
                    </Badge>
                    <Badge tone="neutral" className="capitalize">
                      {r.category}
                    </Badge>
                    <Badge tone={r.severity === 'hard' ? 'danger' : 'warning'}>
                      {r.severity}
                    </Badge>
                    <Badge
                      tone={r.reviewStatus === 'confirmed' ? 'success' : 'warning'}
                    >
                      {r.reviewStatus === 'draft'
                        ? 'Extracted'
                        : 'Confirmed by Compliance'}
                    </Badge>
                  </div>
                  {r.sectionRef ? (
                    <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                      {r.sectionRef}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-[var(--color-ink)]">{r.summary}</p>
                  {r.rawQuote ? (
                    <p className="mt-2 text-xs italic text-[var(--color-ink-muted)]">
                      “{r.rawQuote}”
                    </p>
                  ) : null}
                  {canConfirm && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={r.reviewStatus === 'confirmed'}
                        onClick={() => confirmRestriction(r.id)}
                      >
                        <CheckCircle2 size={13} />
                        {r.reviewStatus === 'confirmed' ? 'Confirmed' : 'Confirm restriction'}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Operating obligations" className="lg:col-span-3">
          {obls.length === 0 ? (
            <EmptyState title="No linked obligations" />
          ) : (
            <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {obls.map((o) => (
                <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="font-medium text-[var(--color-ink)]">{o.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-ink-muted)]">
                      <span className="capitalize">{o.kind.replace(/_/g, ' ')}</span>
                      {o.sectionRef ? <span>{o.sectionRef}</span> : null}
                      {o.dueAt ? <span>Due {formatDate(o.dueAt)}</span> : null}
                      {o.ownerRole ? <span>Owner: {o.ownerRole}</span> : null}
                    </div>
                    {o.evidenceNote ? (
                      <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                        {o.evidenceNote}
                      </p>
                    ) : null}
                  </div>
                  <ObligationStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link
              className="text-sm font-medium text-[var(--color-accent)] hover:underline"
              to="/obligations"
            >
              Open full obligation registry
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Link
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
          to="/instruments"
        >
          ← Legal instruments
        </Link>
      </div>
    </div>
  )
}

function DocStatusBadge({
  status,
}: {
  status: LegalDocument['reviewStatus']
}) {
  if (status === 'confirmed') return <Badge tone="success">Confirmed</Badge>
  if (status === 'extracted') return <Badge tone="warning">Extracted</Badge>
  return <Badge tone="neutral">Processing</Badge>
}

function ObligationStatusBadge({ status }: { status: Obligation['status'] }) {
  const tone =
    status === 'done'
      ? 'success'
      : status === 'overdue'
        ? 'danger'
        : status === 'waived'
          ? 'neutral'
          : 'warning'
  return <Badge tone={tone}>{status}</Badge>
}
