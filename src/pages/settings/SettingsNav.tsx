import { NavLink } from 'react-router-dom'
import { cx } from '../../util/cx'

const links = [
  { to: '/settings/integrations', label: 'Integrations' },
  { to: '/settings/instrument-precedence', label: 'Instrument precedence' },
  { to: '/settings/users', label: 'Users' },
  { to: '/settings/roles', label: 'Roles' },
]

export function SettingsNav() {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            cx(
              'rounded-lg px-3 py-2 text-sm font-medium',
              isActive
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]',
            )
          }
        >
          {l.label}
        </NavLink>
      ))}
    </div>
  )
}
