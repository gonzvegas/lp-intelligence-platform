import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFlash } from '../../components/Flash'
import { api } from '../../api/client'
import type { IntegrationStatus, SyncJob } from '../../domain/types'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { formatDate } from '../../util/format'
import { SettingsNav } from './SettingsNav'

function SyncStatusTone({
  s,
}: {
  s: IntegrationStatus['lastSyncStatus'] | SyncJob['status'] | undefined
}) {
  if (s === 'success') return 'success' as const
  if (s === 'partial' || s === 'failed') return 'danger' as const
  return 'neutral' as const
}

export function Integrations() {
  const flash = useFlash()
  const [rows, setRows] = useState<IntegrationStatus[]>([])
  const [jobs, setJobs] = useState<SyncJob[]>([])
  const [loading, setLoading] = useState(true)
  const [runningId, setRunningId] = useState<string | null>(null)

  async function refresh() {
    const [ints, j] = await Promise.all([api.listIntegrations(), api.listSyncJobs()])
    setRows(ints)
    setJobs(j)
  }

  useEffect(() => {
    let m = true
    ;(async () => {
      await refresh()
      if (!m) return
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [])

  async function toggle(id: string) {
    await api.toggleIntegration(id)
    await refresh()
    flash('Integration connection toggled (demo).')
  }

  async function runSync(integrationId: string) {
    setRunningId(integrationId)
    try {
      const job = await api.runIntegrationSyncDemo(integrationId)
      await refresh()
      flash(job ? `Sync finished — ${job.status}. See audit log and history below.` : 'Connect integration before syncing.')
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div>
      <SettingsNav />
      <PageHeader
        title="Integrations"
        description="Connection status, last sync outcome, and job history — what changed in the system and when (demo-quality transparency for IC / compliance readouts)."
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {rows.map((row) => (
              <Card key={row.id} title={row.name}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={row.connected ? 'success' : 'neutral'}>
                    {row.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                  <Button variant="secondary" className="text-xs" onClick={() => void toggle(row.id)}>
                    Toggle (demo)
                  </Button>
                </div>
                {row.lastSyncAt ? (
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                    Last sync {formatDate(row.lastSyncAt)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">No sync recorded</p>
                )}
                {row.lastSyncStatus ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={SyncStatusTone({ s: row.lastSyncStatus })}>
                      {row.lastSyncStatus}
                    </Badge>
                  </div>
                ) : null}
                {row.lastSyncDetail ? (
                  <p className="mt-2 text-sm leading-snug text-[var(--color-ink)]">{row.lastSyncDetail}</p>
                ) : null}
                <Button
                  variant="primary"
                  className="mt-3 w-full text-xs"
                  disabled={!row.connected || runningId === row.id}
                  onClick={() => void runSync(row.id)}
                >
                  {runningId === row.id ? 'Running sync…' : 'Run sync now (demo)'}
                </Button>
              </Card>
            ))}
          </div>

          <Card title="Recent sync jobs" className="mt-8">
            <p className="mb-4 text-sm text-[var(--color-ink-muted)]">
              Each run is logged to the compliance audit trail with counts for documents and restriction rows touched.
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium text-[var(--color-ink-muted)]">Finished</th>
                    <th className="px-3 py-2 font-medium text-[var(--color-ink-muted)]">Integration</th>
                    <th className="px-3 py-2 font-medium text-[var(--color-ink-muted)]">Status</th>
                    <th className="px-3 py-2 font-medium text-[var(--color-ink-muted)]">Docs</th>
                    <th className="px-3 py-2 font-medium text-[var(--color-ink-muted)]">Restrictions</th>
                    <th className="px-3 py-2 font-medium text-[var(--color-ink-muted)]">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-ink-muted)]">
                        No sync jobs yet. Run a sync on a connected integration.
                      </td>
                    </tr>
                  ) : (
                    jobs.slice(0, 20).map((j) => {
                      const integ = rows.find((r) => r.id === j.integrationId)
                      return (
                        <tr key={j.id} className="hover:bg-[var(--color-surface-muted)]/50">
                          <td className="px-3 py-2 text-[var(--color-ink-muted)]">{formatDate(j.finishedAt)}</td>
                          <td className="px-3 py-2 font-medium text-[var(--color-ink)]">
                            {integ?.name ?? j.integrationId}
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={SyncStatusTone({ s: j.status })}>{j.status}</Badge>
                          </td>
                          <td className="px-3 py-2 tabular-nums">{j.documentsUpserted}</td>
                          <td className="px-3 py-2 tabular-nums">{j.restrictionsTouched}</td>
                          <td className="max-w-md px-3 py-2 text-xs text-[var(--color-ink-muted)]">{j.message}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
              Job ids appear as <code className="rounded bg-[var(--color-surface-muted)] px-1">entityRef</code> on{' '}
              <span className="font-medium text-[var(--color-ink)]">sync_job_completed</span> events in{' '}
              <Link to="/compliance/audit" className="text-[var(--color-accent)] hover:underline">
                Compliance → Audit log
              </Link>
              .
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
