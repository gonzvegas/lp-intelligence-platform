import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Obligation } from '../domain/types'
import { INSTRUMENT_LABEL } from '../domain/legal'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from '../components/ui'
import { useFlash } from '../components/Flash'
import { PERSONA_LABEL } from '../domain/personas'
import { useAppContext } from '../context/AppContext'
import { formatDate } from '../util/format'

export function ObligationRegistry() {
  const { persona } = useAppContext()
  const flash = useFlash()
  const [rows, setRows] = useState<Obligation[]>([])
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setRows(await api.listObligations())
  }

  useEffect(() => {
    let m = true
    ;(async () => {
      const data = await api.listObligations()
      if (!m) return
      setRows(data)
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [])

  const visible =
    filter === 'open'
      ? rows.filter((o) => o.status === 'open' || o.status === 'overdue')
      : rows

  async function markDone(id: string) {
    await api.completeObligation(id, PERSONA_LABEL[persona])
    await refresh()
    flash('Obligation marked complete — audit event logged (mock).')
  }

  return (
    <div>
      <PageHeader
        title="Obligation registry"
        description="Operating path: consents, notices, MFN windows, ERISA reporting, and co-invest mechanics — evidence-backed task tracking alongside deal screening."
        actions={
          <div className="flex gap-2">
            <Button
              variant={filter === 'open' ? 'primary' : 'secondary'}
              onClick={() => setFilter('open')}
            >
              Open & overdue
            </Button>
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No obligations in this view" />
      ) : (
        <div className="space-y-4">
          {visible.map((o) => (
            <Card key={o.id} title={o.title}>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge tone="neutral" className="capitalize">
                  {o.kind.replace(/_/g, ' ')}
                </Badge>
                <Badge tone="accent">
                  {INSTRUMENT_LABEL[o.instrumentKind]}
                </Badge>
                <span className="text-[var(--color-ink-muted)]">
                  Owner: {o.ownerRole}
                </span>
                {o.dueAt ? (
                  <span className="text-[var(--color-ink-muted)]">
                    Due {formatDate(o.dueAt)}
                  </span>
                ) : null}
                {o.recurrence ? (
                  <span className="text-[var(--color-ink-muted)]">
                    {o.recurrence}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  className="font-medium text-[var(--color-accent)] hover:underline"
                  to={`/instruments/${o.legalDocumentId}`}
                >
                  Source instrument
                </Link>
                {o.lpId ? (
                  <Link
                    className="text-[var(--color-accent)] hover:underline"
                    to={`/lps/${o.lpId}`}
                  >
                    LP profile
                  </Link>
                ) : (
                  <span className="text-[var(--color-ink-muted)]">Fund-wide</span>
                )}
                {o.dealId ? (
                  <Link
                    className="text-[var(--color-accent)] hover:underline"
                    to={`/deals/${o.dealId}/screening`}
                  >
                    Deal screening
                  </Link>
                ) : null}
              </div>
              {o.evidenceNote ? (
                <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                  {o.evidenceNote}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ObligationStatusBadge status={o.status} />
                <Button
                  variant="secondary"
                  disabled={o.status === 'done'}
                  onClick={() => markDone(o.id)}
                >
                  Mark complete (mock)
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
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
