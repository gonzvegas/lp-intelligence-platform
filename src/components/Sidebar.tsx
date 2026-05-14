import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  Link2,
  Scale,
  Settings,
  ShieldCheck,
  ListOrdered,
} from 'lucide-react'
import { PERSONA_LABEL } from '../domain/personas'
import { can, type Permission } from '../domain/access'
import { useAppContext } from '../context/AppContext'
import { cx } from '../util/cx'
import type { PersonaId } from '../domain/types'

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  /** If set, persona must have this permission to see the item. */
  permission?: Permission
  /** Visual grouping separator above this item. */
  group?: string
}

const nav: NavItem[] = [
  { to: '/',                    label: 'Dashboard',         icon: LayoutDashboard, end: true },
  { to: '/funds',               label: 'Funds',             icon: Briefcase },
  { to: '/lps',                 label: 'LP Management',     icon: Building2 },
  { to: '/instruments',         label: 'Legal Instruments', icon: FileStack },
  { to: '/obligations',         label: 'Obligations',       icon: ClipboardList },
  { to: '/deals',               label: 'Deal Screening',    icon: Scale,        permission: 'nav:deals' },
  { to: '/settings/instrument-precedence', label: 'Instrument precedence', icon: ListOrdered, permission: 'nav:instrument_precedence' },
  { to: '/capacity',            label: 'Capacity',          icon: BarChart3 },
  { to: '/compliance',          label: 'Compliance',        icon: ShieldCheck },
  { to: '/settings/integrations', label: 'Integrations',   icon: Link2,        permission: 'nav:integrations', group: 'Admin' },
  { to: '/settings/users',      label: 'Users & Roles',     icon: Settings,     permission: 'nav:admin' },
]

export function Sidebar() {
  const { persona } = useAppContext()

  const visible = nav.filter(
    (item) => !item.permission || can(persona as PersonaId, item.permission),
  )

  let lastGroup: string | undefined = undefined

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Brand */}
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]">
            <BookOpen size={15} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-[var(--color-ink)]">LP Intelligence</div>
            <div className="text-xs text-[var(--color-ink-muted)]">Platform</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-accent-muted)] px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          <span className="text-xs text-[var(--color-ink-muted)]">Viewing as </span>
          <span className="text-xs font-semibold text-[var(--color-accent)]">{PERSONA_LABEL[persona]}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {visible.map((item) => {
          const showGroup = item.group && item.group !== lastGroup
          if (showGroup) lastGroup = item.group

          return (
            <div key={item.to}>
              {showGroup && (
                <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
                  {item.group}
                </div>
              )}
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={16}
                      strokeWidth={isActive ? 2.25 : 1.75}
                      className="shrink-0"
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-ink-muted)]">
        Frontend shell · mock data
      </div>
    </aside>
  )
}
