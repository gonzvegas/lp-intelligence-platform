import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFlash } from '../../components/Flash'
import { InstrumentOrderList } from '../../components/InstrumentOrderList'
import { api } from '../../api/client'
import { Button, Card, PageHeader } from '../../components/ui'
import { useAppContext } from '../../context/AppContext'
import type { LegalInstrumentKind } from '../../domain/types'
import {
  PRECEDENCE_INSTRUMENT_ORDER,
  PRECEDENCE_POLICY_NOTE,
} from '../../domain/legal'
import { SettingsNav } from './SettingsNav'

function ordersEqual(a: LegalInstrumentKind[], b: LegalInstrumentKind[]): boolean {
  if (a.length !== b.length) return false
  return a.every((k, i) => k === b[i])
}

export function InstrumentPrecedence() {
  const { fundId, fundName } = useAppContext()
  const flash = useFlash()
  const defaultOrder = PRECEDENCE_INSTRUMENT_ORDER
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<LegalInstrumentKind[]>(() => [...defaultOrder])

  useEffect(() => {
    let m = true
    setLoading(true)
    ;(async () => {
      const o = await api.getInstrumentPrecedence(fundId)
      if (!m) return
      setOrder(o.length ? [...o] : [...defaultOrder])
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [fundId])

  const move = useCallback((idx: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const j = idx + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await api.saveInstrumentPrecedence(fundId, order)
      flash('Fund default document order saved.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setSaving(true)
    try {
      await api.clearInstrumentPrecedence(fundId)
      setOrder([...defaultOrder])
      flash('Fund default reverted to built-in order.')
    } finally {
      setSaving(false)
    }
  }

  const isDefault = ordersEqual(order, defaultOrder)

  return (
    <div>
      <SettingsNav />
      <PageHeader
        title="Instrument precedence"
        description={`Fund default for ${fundName}: LPs use this order unless an LP has their own document priority on their profile.`}
      />

      <Card className="mb-6">
        <p className="text-sm text-[var(--color-ink-muted)]">{PRECEDENCE_POLICY_NOTE}</p>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          <Link to="/lps" className="font-medium text-[var(--color-accent)] hover:underline">
            Open an LP
          </Link>{' '}
          to set LP-specific precedence when side letters differ from the fund template.
        </p>
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <Card
          title="Fund default · document type priority"
          subtitle="Applies to every LP in this fund that has not saved an LP-specific order. Screening sorts overlapping restriction hits using each LP’s effective order (LP override or this default)."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                type="button"
                disabled={saving || isDefault}
                onClick={handleReset}
              >
                Use built-in default
              </Button>
              <Button type="button" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save fund default'}
              </Button>
            </div>
          }
        >
          <p className="mb-4 text-xs text-[var(--color-ink-muted)]">
            {!isDefault ? (
              <span className="font-medium text-[var(--color-ink)]">Custom fund default</span>
            ) : (
              <span>Using the built-in default order for this fund.</span>
            )}
          </p>
          <InstrumentOrderList order={order} onMove={move} disabled={saving} />
          <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
            Tip: change the <strong className="text-[var(--color-ink)]">Fund</strong> in the top bar
            to edit another fund.{' '}
            <Link to="/deals" className="font-medium text-[var(--color-accent)] hover:underline">
              Deal Screening
            </Link>{' '}
            applies each LP’s effective order on the next preview or run.
          </p>
        </Card>
      )}
    </div>
  )
}
