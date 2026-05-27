import { Navigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { can, type Permission } from '../domain/access'
import { useAppContext } from '../context/AppContext'
import type { PersonaId } from '../domain/types'
import { PERSONA_LABEL } from '../domain/personas'

/**
 * Wraps a route and redirects (or shows a denial page) when the current
 * persona lacks the required permission.
 */
export function RequireRole({
  permission,
  children,
  redirect,
}: {
  permission: Permission
  children: React.ReactNode
  /** If true, redirect to `/dashboard` instead of showing the inline denial page. */
  redirect?: boolean
}) {
  const { persona } = useAppContext()
  const allowed = can(persona as PersonaId, permission)

  if (!allowed) {
    if (redirect) return <Navigate to="/dashboard" replace />
    return <AccessDenied permission={permission} persona={persona as PersonaId} />
  }

  return <>{children}</>
}

function AccessDenied({ permission, persona }: { permission: Permission; persona: PersonaId }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldOff size={24} className="text-red-500" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Access restricted</h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
        Your current role (<strong>{PERSONA_LABEL[persona]}</strong>) does not have permission
        for <code className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-xs">{permission}</code>.
        Switch to an authorised persona using the <em>View as</em> selector above.
      </p>
    </div>
  )
}
