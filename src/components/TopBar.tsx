import type { PersonaId } from '../domain/types'
import { PERSONA_LABEL } from '../domain/personas'
import { funds } from '../mocks/fixtures'
import { useAppContext } from '../context/AppContext'
import { Badge } from './ui'

const personas: PersonaId[] = [
  'gp',
  'compliance',
  'ir',
  'legal',
  'admin',
]

export function TopBar() {
  const { fundId, setFundId, fundName, persona, setPersona } = useAppContext()

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
      <div className="flex min-w-[200px] flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          Active fund context
        </span>
        <select
          className="max-w-md rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)]"
          value={fundId}
          onChange={(e) => setFundId(e.target.value)}
          aria-label="Fund and vintage"
        >
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} — {f.vintage}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--color-ink-muted)]">{fundName}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Demo persona switcher
          </span>
          <select
            className="min-w-[220px] rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
            value={persona}
            onChange={(e) => setPersona(e.target.value as PersonaId)}
            aria-label="Preview persona"
          >
            {personas.map((p) => (
              <option key={p} value={p}>
                {PERSONA_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
          <div className="text-right">
            <div className="text-sm font-medium text-[var(--color-ink)]">
              Demo user
            </div>
            <div className="text-xs text-[var(--color-ink-muted)]">
              viewer@example.com
            </div>
          </div>
          <Badge tone="accent">{PERSONA_LABEL[persona].split('/')[0]?.trim()}</Badge>
        </div>
      </div>
    </header>
  )
}
