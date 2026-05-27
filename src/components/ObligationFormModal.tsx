import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CreateObligationInput, LegalDocument, ObligationKind } from '../domain/types'
import { INSTRUMENT_LABEL } from '../domain/legal'
import { Button } from './ui'

const KIND_OPTIONS: { value: ObligationKind; label: string }[] = [
  { value: 'notice', label: 'Notice' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'consent', label: 'Consent' },
  { value: 'mfn_election_window', label: 'MFN election window' },
  { value: 'co_invest_allocation', label: 'Co-invest allocation' },
  { value: 'other', label: 'Other' },
]

const OWNER_OPTIONS = ['Compliance', 'Legal', 'IR', 'Fund Manager', 'Fund Accountant']

export type ObligationFormValues = CreateObligationInput

type Props = {
  open: boolean
  title: string
  initial: ObligationFormValues
  documents?: LegalDocument[]
  submitLabel?: string
  onClose: () => void
  onSubmit: (values: ObligationFormValues) => Promise<void>
}

const fieldClass =
  'mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]'

export function ObligationFormModal({
  open,
  title,
  initial,
  documents,
  submitLabel = 'Create obligation',
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues(initial)
      setError(null)
    }
  }, [open, initial])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        ownerRole: values.ownerRole?.trim() || 'Compliance',
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save obligation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="obligation-form-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="obligation-form-title" className="text-base font-semibold text-[var(--color-ink)]">
              {title}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Operating tasks are created by your team — not auto-generated from extraction.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {documents && documents.length > 0 ? (
            <label className="block text-sm">
              <span className="font-medium text-[var(--color-ink)]">Instrument</span>
              <select
                className={fieldClass}
                value={values.legalDocumentId}
                onChange={(e) => {
                  const doc = documents.find((d) => d.id === e.target.value)
                  if (!doc) return
                  setValues((v) => ({
                    ...v,
                    legalDocumentId: doc.id,
                    instrumentKind: doc.kind,
                    lpId: doc.lpId,
                    dealId: doc.dealId,
                  }))
                }}
                required
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} · {INSTRUMENT_LABEL[d.kind]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="font-medium text-[var(--color-ink)]">Title</span>
            <input
              className={fieldClass}
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-[var(--color-ink)]">Type</span>
              <select
                className={fieldClass}
                value={values.kind}
                onChange={(e) =>
                  setValues((v) => ({ ...v, kind: e.target.value as ObligationKind }))
                }
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-[var(--color-ink)]">Owner</span>
              <select
                className={fieldClass}
                value={values.ownerRole ?? 'Compliance'}
                onChange={(e) => setValues((v) => ({ ...v, ownerRole: e.target.value }))}
              >
                {OWNER_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-[var(--color-ink)]">Due date</span>
              <input
                type="datetime-local"
                className={fieldClass}
                value={values.dueAt ? toLocalInputValue(values.dueAt) : ''}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    dueAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }))
                }
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-[var(--color-ink)]">Recurrence</span>
              <input
                className={fieldClass}
                placeholder="e.g. Annual"
                value={values.recurrence ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, recurrence: e.target.value || undefined }))
                }
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-[var(--color-ink)]">Section reference</span>
            <input
              className={fieldClass}
              placeholder="e.g. § 3.1"
              value={values.sectionRef ?? ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, sectionRef: e.target.value || undefined }))
              }
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[var(--color-ink)]">Notes</span>
            <textarea
              className={`${fieldClass} min-h-[72px] resize-y`}
              placeholder="Evidence requirements, contacts, or context for the owner"
              value={values.evidenceNote ?? ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, evidenceNote: e.target.value || undefined }))
              }
            />
          </label>

          {values.sourceRestrictionId ? (
            <p className="text-xs text-[var(--color-ink-muted)]">
              Linked to extracted clause{' '}
              <span className="font-mono">{values.sourceRestrictionId}</span>
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
