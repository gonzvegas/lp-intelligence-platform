import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../../api/client'
import type { SignOff } from '../../domain/types'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { PERSONA_LABEL } from '../../domain/personas'
import { can } from '../../domain/access'
import { useAppContext } from '../../context/AppContext'
import { formatDate } from '../../util/format'

export function SignOffs() {
  const { persona } = useAppContext()
  const flash = useFlash()
  const [rows, setRows] = useState<SignOff[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const canAct = can(persona, 'action:approve_signoff')

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
    return () => { m = false }
  }, [])

  async function act(id: string, status: SignOff['status']) {
    setActing(id)
    try {
      await api.updateSignOff(id, status, PERSONA_LABEL[persona])
      await refresh()
      flash(`Sign-off ${status === 'approved' ? 'approved' : 'rejected'} — audit trail updated.`)
    } finally {
      setActing(null)
    }
  }

  const pending = rows.filter((s) => s.status === 'pending')
  const resolved = rows.filter((s) => s.status !== 'pending')

  return (
    <div>
      <PageHeader
        title="Sign-offs"
        description="Compliance queue tying screening evidence to formal approvals before IC."
      />

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No sign-offs in queue" />
      ) : (
        <div className="space-y-6">
          {!canAct && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Viewing as <strong>{PERSONA_LABEL[persona]}</strong> — approve/reject actions require Compliance Officer, Legal/CCO, or Admin role.
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Pending review</h2>
              <div className="space-y-3">
                {pending.map((s) => (
                  <SignOffCard
                    key={s.id}
                    s={s}
                    canAct={canAct}
                    acting={acting === s.id}
                    onAct={act}
                  />
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Resolved</h2>
              <div className="space-y-3">
                {resolved.map((s) => (
                  <SignOffCard
                    key={s.id}
                    s={s}
                    canAct={false}
                    acting={false}
                    onAct={act}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SignOffCard({
  s,
  canAct,
  acting,
  onAct,
}: {
  s: SignOff
  canAct: boolean
  acting: boolean
  onAct: (id: string, status: SignOff['status']) => void
}) {
  return (
    <Card key={s.id}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-[var(--color-ink)]">{s.dealName}</div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-[var(--color-ink-muted)]">
            <span>Requested {formatDate(s.requestedAt)}</span>
            <span>·</span>
            <span>{s.assigneeRole}</span>
            <span>·</span>
            <span className="font-mono">Run {s.screeningRunId}</span>
          </div>
        </div>
        <Badge
          tone={
            s.status === 'approved'
              ? 'success'
              : s.status === 'pending'
              ? 'warning'
              : 'danger'
          }
        >
          {s.status === 'approved' ? 'Approved' : s.status === 'pending' ? 'Pending' : 'Rejected'}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
          to={`/deals/${s.dealId}/screening`}
        >
          View screening
        </Link>
        {canAct && s.status === 'pending' && (
          <>
            <Button
              variant="secondary"
              disabled={acting}
              onClick={() => onAct(s.id, 'approved')}
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              Approve
            </Button>
            <Button
              variant="danger"
              disabled={acting}
              onClick={() => onAct(s.id, 'rejected')}
            >
              <XCircle size={14} />
              Reject
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
