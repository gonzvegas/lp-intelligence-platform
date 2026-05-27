import { useMsal } from '@azure/msal-react'
import { ChevronDown, LogOut, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { getEntraConfigured, isAuthBypassed } from '../auth/msalConfig'
import type { PersonaId } from '../domain/types'
import { PERSONA_LABEL } from '../domain/personas'
import { useAppContext } from '../context/AppContext'

const personas: PersonaId[] = ['gp', 'compliance', 'ir', 'legal', 'admin']

const PERSONA_INITIALS: Record<PersonaId, string> = {
  gp: 'GP',
  compliance: 'CO',
  ir: 'IR',
  legal: 'LG',
  admin: 'AD',
}

const PERSONA_COLOR: Record<PersonaId, string> = {
  gp: 'bg-violet-100 text-violet-800 dark:bg-violet-900/55 dark:text-violet-200',
  compliance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/55 dark:text-blue-200',
  ir: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/55 dark:text-emerald-200',
  legal: 'bg-amber-100 text-amber-800 dark:bg-amber-900/55 dark:text-amber-200',
  admin: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

function EntraSignOutButtonInner() {
  const { instance } = useMsal()

  return (
    <button
      type="button"
      onClick={() =>
        void instance.logoutRedirect({
          postLogoutRedirectUri: `${window.location.origin}/`,
        })
      }
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      title="Sign out of Microsoft"
    >
      <LogOut size={14} strokeWidth={2} className="shrink-0" aria-hidden />
      Log out
    </button>
  )
}

function EntraSignOutButton() {
  if (!getEntraConfigured() || isAuthBypassed()) return null
  return <EntraSignOutButtonInner />
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
        {label}
      </span>
        <div className="relative">
        <select
          className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-3 pr-8 text-sm font-medium text-[var(--color-ink)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        />
      </div>
    </div>
  )
}

export function TopBar() {
  const { pathname } = useLocation()
  const {
    fundId,
    setFundId,
    funds,
    fundsLoading,
    persona,
    setPersona,
    colorScheme,
    toggleColorScheme,
  } = useAppContext()

  const selectValue =
    fundId && funds.some((f) => f.id === fundId) ? fundId : funds[0]?.id ?? ''

  /** Fund picker is meaningless on Fund Management — the whole page is funds. */
  const showFundPicker = pathname.replace(/\/$/, '') !== '/funds'

  const personaLabel = PERSONA_LABEL[persona]
  const initials = PERSONA_INITIALS[persona]

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
      <div className="flex flex-wrap items-end gap-6">
        {showFundPicker ? (
          <SelectField
            label="Fund"
            value={selectValue}
            onChange={setFundId}
            disabled={fundsLoading || funds.length === 0}
          >
            {fundsLoading ? (
              <option value="">Loading funds…</option>
            ) : funds.length === 0 ? (
              <option value="">No funds yet — add under Fund Management</option>
            ) : (
              funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.vintage ? ` (${f.vintage})` : ''}
                </option>
              ))
            )}
          </SelectField>
        ) : null}

        <SelectField
          label="View as"
          value={persona}
          onChange={(v) => setPersona(v as PersonaId)}
        >
          {personas.map((p) => (
            <option key={p} value={p}>
              {PERSONA_LABEL[p]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <EntraSignOutButton />
        <button
          type="button"
          onClick={toggleColorScheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] transition hover:bg-[var(--color-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
          title={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {colorScheme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>

        {/* User chip */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${PERSONA_COLOR[persona]}`}
          >
            {initials}
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-ink)]">Demo user</div>
            <div className="text-xs text-[var(--color-ink-muted)]">{personaLabel}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
