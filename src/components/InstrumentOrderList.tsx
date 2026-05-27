import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Upload } from 'lucide-react'
import type { LegalDocument, LegalInstrumentKind } from '../domain/types'
import { INSTRUMENT_LABEL, precedencePriorityLabel } from '../domain/legal'
import { Badge, Button } from './ui'

export function InstrumentOrderList({
  order,
  onMove,
  disabled,
  documentByKind,
  onPickUpload,
  uploadingKind,
}: {
  order: LegalInstrumentKind[]
  onMove: (index: number, direction: -1 | 1) => void
  disabled?: boolean
  /** Latest governing row per instrument type (shown as link instead of placeholder). */
  documentByKind?: Partial<Record<LegalInstrumentKind, LegalDocument>>
  onPickUpload?: (kind: LegalInstrumentKind, file: File) => void | Promise<void>
  uploadingKind?: LegalInstrumentKind | null
}) {
  const inputByKind = useRef<Partial<Record<LegalInstrumentKind, HTMLInputElement | null>>>({})

  return (
    <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30">
      {order.map((kind, idx) => (
        <li key={kind} className="px-3 py-3 text-sm sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <span className="w-28 shrink-0 tabular-nums text-xs font-semibold text-[var(--color-ink-muted)]">
              {precedencePriorityLabel(idx)}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="font-medium text-[var(--color-ink)]">{INSTRUMENT_LABEL[kind]}</span>
              {onPickUpload ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={(el) => {
                      inputByKind.current[kind] = el
                    }}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    aria-hidden
                    disabled={disabled || uploadingKind === kind}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file || !onPickUpload) return
                      void onPickUpload(kind, file)
                    }}
                  />
                  {documentByKind?.[kind] ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
                        to={`/instruments/${documentByKind[kind]!.id}`}
                      >
                        {documentByKind[kind]!.title}
                      </Link>
                      <Badge tone="neutral" className="text-[10px]">
                        {INSTRUMENT_LABEL[kind]}
                      </Badge>
                      <button
                        type="button"
                        disabled={disabled || uploadingKind === kind}
                        onClick={() => inputByKind.current[kind]?.click()}
                        className="text-[11px] font-medium text-[var(--color-ink-muted)] underline-offset-2 hover:text-[var(--color-accent)] hover:underline disabled:opacity-50"
                      >
                        {uploadingKind === kind ? 'Uploading…' : 'Replace PDF'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled || uploadingKind === kind}
                      onClick={() => inputByKind.current[kind]?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
                      aria-label={`Upload PDF — ${INSTRUMENT_LABEL[kind]}`}
                    >
                      <Upload size={13} aria-hidden />
                      {uploadingKind === kind ? 'Uploading…' : `Upload PDF — ${INSTRUMENT_LABEL[kind]}`}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1 self-start pt-0.5 sm:self-center">
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
          </div>
        </li>
      ))}
    </ul>
  )
}
