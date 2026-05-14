import { ArrowDown, ArrowUp } from 'lucide-react'
import type { LegalInstrumentKind } from '../domain/types'
import { INSTRUMENT_LABEL, precedencePriorityLabel } from '../domain/legal'
import { Button } from './ui'

export function InstrumentOrderList({
  order,
  onMove,
  disabled,
}: {
  order: LegalInstrumentKind[]
  onMove: (index: number, direction: -1 | 1) => void
  disabled?: boolean
}) {
  return (
    <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30">
      {order.map((kind, idx) => (
        <li
          key={kind}
          className="flex items-center gap-3 px-3 py-3 text-sm sm:px-4"
        >
          <span className="w-24 shrink-0 tabular-nums text-xs font-semibold text-[var(--color-ink-muted)]">
            {precedencePriorityLabel(idx)}
          </span>
          <span className="min-w-0 flex-1 font-medium text-[var(--color-ink)]">
            {INSTRUMENT_LABEL[kind]}
          </span>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="secondary"
              type="button"
              className="px-2 py-1.5"
              disabled={idx === 0 || disabled}
              aria-label={`Move ${INSTRUMENT_LABEL[kind]} up`}
              onClick={() => onMove(idx, -1)}
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              variant="secondary"
              type="button"
              className="px-2 py-1.5"
              disabled={idx === order.length - 1 || disabled}
              aria-label={`Move ${INSTRUMENT_LABEL[kind]} down`}
              onClick={() => onMove(idx, 1)}
            >
              <ArrowDown size={16} />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
