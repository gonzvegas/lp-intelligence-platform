import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Role, UserAccount } from '../../domain/types'
import { Badge, Card, PageHeader } from '../../components/ui'
import { SettingsNav } from './SettingsNav'

export function Users() {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let m = true
    ;(async () => {
      const [u, r] = await Promise.all([api.listUsers(), api.listRoles()])
      if (!m) return
      setUsers(u)
      setRoles(r)
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [])

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id

  return (
    <div>
      <SettingsNav />
      <PageHeader
        title="Users"
        description="Provision platform access — SSO mapping arrives with backend auth."
        actions={
          <button
            type="button"
            disabled
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Invite user (stub)
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 pr-4 font-medium">{u.name}</td>
                    <td className="py-2 pr-4 text-[var(--color-ink-muted)]">{u.email}</td>
                    <td className="py-2">
                      <Badge tone="accent">{roleName(u.roleId)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
