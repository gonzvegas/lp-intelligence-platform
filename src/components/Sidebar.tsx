import { NavLink } from 'react-router-dom'
import { PERSONA_LABEL } from '../domain/personas'
import { useAppContext } from '../context/AppContext'
import { cx } from '../util/cx'

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/lps', label: 'LP Management' },
  { to: '/side-letters', label: 'Side Letter Intelligence' },
  { to: '/deals', label: 'Deal Screening' },
  { to: '/capacity', label: 'Capacity' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/settings/integrations', label: 'Integrations' },
  { to: '/settings/users', label: 'Admin' },
]

export function Sidebar() {
  const { persona } = useAppContext()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          LP Intelligence
        </div>
        <div className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
          Platform
        </div>
        <div className="mt-3 rounded-lg bg-[var(--color-accent-muted)] px-3 py-2 text-xs text-[var(--color-ink)]">
          View as:{' '}
          <span className="font-medium">{PERSONA_LABEL[persona]}</span>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'block rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[var(--color-border)] px-5 py-4 text-xs text-[var(--color-ink-muted)]">
        Frontend shell — mock data only. Fund & persona persist for this browser tab.
      </div>
    </aside>
  )
}
