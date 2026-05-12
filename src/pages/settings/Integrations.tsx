import { useEffect, useState } from 'react'
import { useFlash } from '../../components/Flash'
import { api } from '../../api/client'
import type { IntegrationStatus } from '../../domain/types'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { formatDate } from '../../util/format'
import { SettingsNav } from './SettingsNav'

export function Integrations() {
  const flash = useFlash()
  const [rows, setRows] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setRows(await api.listIntegrations())
  }

  useEffect(() => {
    let m = true
    ;(async () => {
      const data = await api.listIntegrations()
      if (!m) return
      setRows(data)
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

  return (
    <div>
      <SettingsNav />
      <PageHeader
        title="Integrations"
        description="DealCloud, CRM, and CSV ingestion — OAuth flows stubbed in this shell."
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {rows.map((row) => (
            <Card key={row.id} title={row.name}>
              <div className="flex items-center justify-between gap-2">
                <Badge tone={row.connected ? 'success' : 'neutral'}>
                  {row.connected ? 'Connected' : 'Disconnected'}
                </Badge>
                <Button variant="secondary" onClick={() => toggle(row.id)}>
                  Toggle (demo)
                </Button>
              </div>
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                {row.lastSyncAt
                  ? `Last sync ${formatDate(row.lastSyncAt)}`
                  : 'No sync recorded'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
