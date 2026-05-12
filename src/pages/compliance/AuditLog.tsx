import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { AuditEvent } from '../../domain/types'
import { Badge, Card, PageHeader } from '../../components/ui'
import { PERSONA_LABEL } from '../../domain/personas'
import { formatDate } from '../../util/format'

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    api.listAuditEvents().then((rows) => {
      if (!m) return
      setEvents(rows)
      setLoading(false)
    })
    return () => {
      m = false
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Immutable-style timeline (mock) capturing screening runs, confirmations, and integrations."
        actions={
          <button
            type="button"
            disabled
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Export CSV (stub)
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <Card>
          <ol className="relative ms-3 border-s border-[var(--color-border)]">
            {events.map((e) => (
              <li key={e.id} className="mb-8 ms-8">
                <span className="absolute -start-1.5 mt-1.5 flex h-3 w-3 rounded-full border border-[var(--color-border)] bg-[var(--color-accent)]" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{formatDate(e.at)}</Badge>
                  <Badge tone="accent">{PERSONA_LABEL[e.persona]}</Badge>
                  <Badge tone="neutral">{e.type.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">
                  {e.summary}
                </p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  Actor: {e.actor}
                  {e.entityRef ? ` · Ref: ${e.entityRef}` : ''}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}
