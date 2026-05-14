import { ChevronDown } from 'lucide-react'
import type { PersonaId } from '../domain/types'
import { PERSONA_LABEL } from '../domain/personas'
import { funds } from '../mocks/fixtures'
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
  gp: 'bg-violet-100 text-violet-800',
  compliance: 'bg-blue-100 text-blue-800',
  ir: 'bg-emerald-100 text-emerald-800',
  legal: 'bg-amber-100 text-amber-800',
  admin: 'bg-slate-100 text-slate-700',
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
        {label}
      </span>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-3 pr-8 text-sm font-medium text-[var(--color-ink)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
          value={value}
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
  const { fundId, setFundId, persona, setPersona } = useAppContext()

  const personaLabel = PERSONA_LABEL[persona]
  const initials = PERSONA_INITIALS[persona]

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
      <div className="flex flex-wrap items-end gap-6">
        <SelectField label="Fund" value={fundId} onChange={setFundId}>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.vintage})
            </option>
          ))}
        </SelectField>

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
    </header>
  )
}
