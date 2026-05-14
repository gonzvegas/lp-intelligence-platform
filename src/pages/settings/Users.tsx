import { useEffect, useState } from 'react'
import { Check, Pencil, UserCog, X } from 'lucide-react'
import { api } from '../../api/client'
import type { Role, UserAccount } from '../../domain/types'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { SettingsNav } from './SettingsNav'
import { cx } from '../../util/cx'

const ROLE_TONE: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  'role-gp':         'accent',
  'role-compliance': 'warning',
  'role-ir':         'success',
  'role-legal':      'warning',
  'role-admin':      'danger',
}

export function Users() {
  const flash = useFlash()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  /** userId → in-progress roleIds selection */
  const [editing, setEditing] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState<string | null>(null)

  async function reload() {
    const [u, r] = await Promise.all([api.listUsers(), api.listRoles()])
    setUsers(u)
    setRoles(r)
  }

  useEffect(() => {
    let m = true
    reload().then(() => { if (m) setLoading(false) })
    return () => { m = false }
  }, [])

  function startEdit(user: UserAccount) {
    setEditing((e) => ({ ...e, [user.id]: [...user.roleIds] }))
  }

  function cancelEdit(userId: string) {
    setEditing((e) => {
      const next = { ...e }
      delete next[userId]
      return next
    })
  }

  function toggleRole(userId: string, roleId: string) {
    setEditing((e) => {
      const current = e[userId] ?? []
      const next = current.includes(roleId)
        ? current.filter((r) => r !== roleId)
        : [...current, roleId]
      return { ...e, [userId]: next }
    })
  }

  async function saveRoles(userId: string) {
    const newRoleIds = editing[userId]
    if (!newRoleIds || newRoleIds.length === 0) {
      flash('A user must have at least one role.')
      return
    }

    const user = users.find((u) => u.id === userId)
    if (!user) return

    setSaving(userId)
    try {
      await api.setUserRoles(userId, newRoleIds)
      setUsers((us) =>
        us.map((u) => u.id === userId ? { ...u, roleIds: newRoleIds } : u)
      )
      cancelEdit(userId)
      const names = newRoleIds.map((id) => roles.find((r) => r.id === id)?.name ?? id).join(', ')
      flash(`${user.name} → ${names}`)
    } catch {
      flash('Failed to update roles — please try again.')
    } finally {
      setSaving(null)
    }
  }

  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r]))

  return (
    <div>
      <SettingsNav />
      <PageHeader
        title="Users & roles"
        description="Users can hold multiple roles. Click the edit icon to add or remove roles for any user."
        actions={
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            <UserCog size={14} />
            Invite user
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
          Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/60">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">User</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Email</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Roles</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Edit roles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.map((user) => {
                const isEditing = user.id in editing
                const isSaving = saving === user.id
                const pendingIds = editing[user.id] ?? []

                return (
                  <tr
                    key={user.id}
                    className={cx(
                      'transition',
                      isEditing && 'bg-[var(--color-accent-muted)]/20',
                      isSaving && 'opacity-60',
                    )}
                  >
                    {/* Avatar + name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)] text-xs font-bold text-[var(--color-accent)]">
                          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--color-ink)]">{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4 text-[var(--color-ink-muted)]">{user.email}</td>

                    {/* Current role badges */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roleIds.map((rid) => (
                          <Badge key={rid} tone={ROLE_TONE[rid] ?? 'neutral'}>
                            {roleMap[rid]?.name ?? rid}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    {/* Edit roles column */}
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          {/* Checkboxes */}
                          <div className="flex flex-wrap gap-2">
                            {roles.map((role) => {
                              const checked = pendingIds.includes(role.id)
                              return (
                                <label
                                  key={role.id}
                                  className={cx(
                                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition select-none',
                                    checked
                                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-ink)]',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={() => toggleRole(user.id, role.id)}
                                  />
                                  <span className={cx(
                                    'flex h-3.5 w-3.5 items-center justify-center rounded border',
                                    checked
                                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                                      : 'border-current',
                                  )}>
                                    {checked && <Check size={9} strokeWidth={3} className="text-white" />}
                                  </span>
                                  {role.name}
                                </label>
                              )
                            })}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="primary"
                              className="h-7 px-3 text-xs"
                              disabled={isSaving || pendingIds.length === 0}
                              onClick={() => saveRoles(user.id)}
                            >
                              {isSaving ? (
                                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                              ) : (
                                <Check size={12} />
                              )}
                              Save
                            </Button>
                            <button
                              type="button"
                              onClick={() => cancelEdit(user.id)}
                              className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
                            >
                              <X size={12} /> Cancel
                            </button>
                            {pendingIds.length === 0 && (
                              <span className="text-xs text-red-500">At least one role required</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-accent)]"
                        >
                          <Pencil size={12} />
                          Edit roles
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role reference */}
      <div className="mt-8">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">Role reference</h2>
        <p className="mb-4 text-sm text-[var(--color-ink-muted)]">Each role controls which nav sections and actions are available.</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const members = users.filter((u) => u.roleIds.includes(role.id))
            return (
              <Card key={role.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[var(--color-ink)]">{role.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                      {members.length === 0 ? 'No members' : members.length === 1 ? '1 member' : `${members.length} members`}
                    </div>
                  </div>
                  <Badge tone={ROLE_TONE[role.id] ?? 'neutral'} className="shrink-0">
                    {role.id === 'role-admin' ? 'Full access' : 'Scoped'}
                  </Badge>
                </div>
                {members.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {members.map((u) => (
                      <span key={u.id} className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]">
                        {u.name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions.map((p) => (
                    <span key={p} className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-ink-muted)]">
                      {p}
                    </span>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
