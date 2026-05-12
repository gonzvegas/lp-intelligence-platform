import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { SignOff } from '../../domain/types'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { PERSONA_LABEL } from '../../domain/personas'
import { useAppContext } from '../../context/AppContext'
import { formatDate } from '../../util/format'

export function SignOffs() {
  const { persona } = useAppContext()
  const flash = useFlash()
  const [rows, setRows] = useState<SignOff[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setRows(await api.listSignOffs())
  }

  useEffect(() => {
    let m = true
    ;(async () => {
      const data = await api.listSignOffs()
      if (!m) return
      setRows(data)
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [])

  async function act(id: string, status: SignOff['status']) {
    await api.updateSignOff(id, status, PERSONA_LABEL[persona])
    await refresh()
    flash(`Sign-off ${status} — audit trail updated (mock).`)
  }

  return (
    <div>
      <PageHeader
        title="Sign-offs"
        description="Compliance queue tying screening evidence to formal approvals before IC."
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="space-y-4">
          {rows.map((s) => (
            <Card key={s.id} title={s.dealName}>
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge
                  tone={
                    s.status === 'approved'
                      ? 'success'
                      : s.status === 'pending'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {s.status}
                </Badge>
                <span className="text-[var(--color-ink-muted)]">
                  Requested {formatDate(s.requestedAt)}
                </span>
                <span className="text-[var(--color-ink-muted)]">
                  Assignee: {s.assigneeRole}
                </span>
                <span className="font-mono text-xs text-[var(--color-ink-muted)]">
                  Screening {s.screeningRunId}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-muted)]"
                  to={`/deals/${s.dealId}/screening`}
                >
                  View screening
                </Link>
                <Button
                  variant="secondary"
                  disabled={s.status !== 'pending'}
                  onClick={() => act(s.id, 'approved')}
                >
                  Approve (mock)
                </Button>
                <Button
                  variant="danger"
                  disabled={s.status !== 'pending'}
                  onClick={() => act(s.id, 'rejected')}
                >
                  Reject (mock)
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
