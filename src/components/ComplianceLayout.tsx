import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { cx } from '../util/cx'

const tabs = [
  { to: '/compliance/audit', label: 'Audit log' },
  { to: '/compliance/sign-offs', label: 'Sign-offs' },
  { to: '/compliance/obligations', label: 'Obligations' },
  { to: '/compliance/reports', label: 'Reports' },
]

export function ComplianceLayout() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cx(
                'rounded-lg px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}

export function ComplianceIndexRedirect() {
  return <Navigate to="/compliance/audit" replace />
}
