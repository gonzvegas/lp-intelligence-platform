import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ReportJob } from '../../domain/types'
import { Badge, Button, Card, PageHeader } from '../../components/ui'

export function Reports() {
  const [jobs, setJobs] = useState<ReportJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    api.listReportJobs().then((rows) => {
      if (!m) return
      setJobs(rows)
      setLoading(false)
    })
    return () => {
      m = false
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Scheduled attestations for regulators, boards, and LP quarterly questionnaires."
        actions={
          <Button variant="secondary" disabled>
            Request new report (stub)
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} title={job.name}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[var(--color-ink-muted)]">
                  Requested {job.requestedAt.slice(0, 10)}
                </div>
                <Badge
                  tone={
                    job.status === 'ready'
                      ? 'success'
                      : job.status === 'queued'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {job.status}
                </Badge>
              </div>
              <Button className="mt-4 w-full" variant="secondary" disabled={job.status !== 'ready'}>
                Download PDF (stub)
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
