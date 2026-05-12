import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Role } from '../../domain/types'
import { Badge, Card, PageHeader } from '../../components/ui'
import { SettingsNav } from './SettingsNav'

export function Roles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    api.listRoles().then((r) => {
      if (!m) return
      setRoles(r)
      setLoading(false)
    })
    return () => {
      m = false
    }
  }, [])

  return (
    <div>
      <SettingsNav />
      <PageHeader
        title="Roles & permissions"
        description="Coarse capability bundles aligned with LP Intelligence personas."
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id} title={role.name}>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((p) => (
                  <Badge key={p} tone="neutral">
                    {p}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
