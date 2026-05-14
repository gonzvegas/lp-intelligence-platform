import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, FileText } from 'lucide-react'
import { api } from '../../api/client'
import type {
  AuditEvent,
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
import { can } from '../../domain/access'
import { useAppContext } from '../../context/AppContext'
import {
  ingestionSourceLabel,
  PIPELINE_STEPS_EXCLUDING_ARCHIVED,
  pipelineStageLabel,
  pipelineStepIndex,
  resolvePipelineStage,
} from '../../domain/documentPipeline'
import { formatDate } from '../../util/format'

export function InstrumentDetail() {
  const { id } = useParams<{ id: string }>()
  const { persona } = useAppContext()
  const flash = useFlash()
  const canConfirm = can(persona, 'action:confirm_restriction')
  const [doc, setDoc] = useState<LegalDocument | null>(null)
  const [rest, setRest] = useState<ExtractedRestriction[]>([])
  const [obls, setObls] = useState<Obligation[]>([])
  const [docAudits, setDocAudits] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let m = true
    setLoading(true)
    ;(async () => {
      const [d, allR, allO, audits] = await Promise.all([
        api.getLegalDocument(id),
        api.listRestrictions(),
        api.listObligations(),
        api.listAuditEvents(),
      ])
      if (!m) return
      setDoc(d ?? null)
      setRest(allR.filter((r) => r.legalDocumentId === id))
      setObls(allO.filter((o) => o.legalDocumentId === id))
      setDocAudits(audits.filter((e) => e.entityRef === id))
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [id])

  async function confirmRestriction(rid: string) {
    const updated = await api.reviewRestriction(rid, 'confirm')
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

  const ver = doc.versionNumber ?? 1
  const effective = doc.effectiveFrom ? formatDate(doc.effectiveFrom) : formatDate(doc.uploadedAt)
  const pipe = resolvePipelineStage(doc)
  const pipeIdx = pipelineStepIndex(pipe)

  return (
    <div>
      <PageHeader
        title={doc.title}
        description={`${INSTRUMENT_LABEL[doc.kind]} · version ${ver} · effective ${effective} · ${ingestionSourceLabel(doc.ingestionSource)} · uploaded ${formatDate(doc.uploadedAt)}.`}
      />

      <Card title="Governance & versioning" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <dl className="space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--color-ink-muted)]">Catalog version</dt>
              <dd className="font-semibold text-[var(--color-ink)]">v{ver}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--color-ink-muted)]">Effective for policy</dt>
              <dd className="font-medium text-[var(--color-ink)]">{effective}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--color-ink-muted)]">Ingestion</dt>
              <dd className="text-[var(--color-ink)]">{ingestionSourceLabel(doc.ingestionSource)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--color-ink-muted)]">Pipeline stage</dt>
              <dd>
                <Badge tone={pipe === 'archived' ? 'neutral' : pipe === 'active' ? 'success' : 'warning'}>
                  {pipelineStageLabel(pipe)}
                </Badge>
              </dd>
            </div>
          </dl>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3 text-sm text-[var(--color-ink-muted)]">
            {doc.supersedesDocumentId ? (
              <p>
                <span className="font-medium text-[var(--color-ink)]">Supersedes: </span>
                <Link className="text-[var(--color-accent)] hover:underline" to={`/instruments/${doc.supersedesDocumentId}`}>
                  Open prior version
                </Link>
              </p>
            ) : (
              <p>Original filing — no prior version in catalog.</p>
            )}
            {doc.replacedByDocumentId ? (
              <p className="mt-2">
                <span className="font-medium text-[var(--color-ink)]">Superseded by: </span>
                <Link className="text-[var(--color-accent)] hover:underline" to={`/instruments/${doc.replacedByDocumentId}`}>
                  Open newer version
                </Link>
              </p>
            ) : (
              <p className="mt-2">This is the latest catalog row for this instrument family.</p>
            )}
            <p className="mt-3 text-xs">
              Screening and obligations pin to <strong>document id</strong> and <strong>extracted clause version</strong> stamps
              below so IC can explain which text produced each rule.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Document & restriction pipeline" className="mb-6">
        {pipe === 'archived' ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Archived version — excluded from active rulepack. Use the newer LPA link above for governing text.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {PIPELINE_STEPS_EXCLUDING_ARCHIVED.map((step, i) => {
              const done = pipeIdx >= i
              return (
                <div key={step} className="flex items-center gap-2">
                  {i > 0 ? <span className="text-[var(--color-border)]">→</span> : null}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      done
                        ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                        : 'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]'
                    }`}
                  >
                    {pipelineStageLabel(step)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          Extraction assigns each clause a batch id (see restrictions). Legal confirmation promotes rows to screening;
          DealCloud sync can bump document versions with full audit.
        </p>
      </Card>

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
                    <Badge tone="neutral" className="text-[10px]">
                      Demo clause order · {r.precedenceRank}
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
                    {r.documentVersionNumber != null ? (
                      <Badge tone="neutral" className="text-[10px]">
                        Clause ↔ doc v{r.documentVersionNumber}
                      </Badge>
                    ) : null}
                    {r.extractionBatchId ? (
                      <Badge tone="neutral" className="font-mono text-[10px]">
                        {r.extractionBatchId}
                      </Badge>
                    ) : null}
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

        <Card title="Audit — this instrument" className="lg:col-span-3">
          {docAudits.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No audit events reference this document id (`{doc.id}`) yet. Upload, versioning, and pipeline changes
              appear here with full actor and timestamp.
            </p>
          ) : (
            <ol className="space-y-4 border-l border-[var(--color-border)] ps-4">
              {docAudits.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{formatDate(e.at)}</Badge>
                    <Badge tone="accent">{e.type.replaceAll('_', ' ')}</Badge>
                  </div>
                  <p className="mt-1 font-medium text-[var(--color-ink)]">{e.summary}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Actor: {e.actor}</p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
            <Link className="font-medium text-[var(--color-accent)] hover:underline" to="/compliance/audit">
              Compliance → full audit log
            </Link>
          </p>
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
