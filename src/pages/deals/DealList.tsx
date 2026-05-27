import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { api } from '../../api/client'
import type { Deal } from '../../domain/types'
import { Badge, Button, PageHeader } from '../../components/ui'
import { formatUsd } from '../../util/format'
import { useAppContext } from '../../context/AppContext'

const SECTORS = [
  'Energy — Midstream',
  'Energy — Power',
  'Energy — Upstream',
  'Healthcare',
  'Industrials',
  'Consumer — Gaming',
  'Consumer — Retail',
  'Consumer — Food & Beverage',
  'Technology — Software',
  'Technology — Hardware',
  'Financial Services',
  'Real Estate',
  'Infrastructure',
  'Other',
]

const DEAL_TYPES = [
  'First Lien Term Loan',
  'Second Lien Term Loan',
  'Unitranche',
  'Mezzanine',
  'Revolving Credit Facility',
  'Bridge Facility',
  'Delayed Draw Term Loan',
]

const SECURITY_TYPES = [
  'Senior Secured',
  'Senior Unsecured',
  'Subordinated',
  'Second Lien',
]

const STAGES = [
  'Pre-pipeline',
  'New deal',
  'Due diligence',
  'Term sheet',
  'Submitted terms',
  'Prelim IC',
  'IC pending',
  'Closed',
  'Passed / Dead',
]

interface FormState {
  name: string
  sector: string
  geography: string
  dealType: string
  securityType: string
  proposedAmountUsd: string
  pipelineStage: string
  ebitdaUsd: string
  revenueUsd: string
  leverageMultiple: string
  ltvPct: string
  sponsored: boolean
  coInvest: boolean
  esgFlags: string
  structureTags: string
}

const BLANK: FormState = {
  name: '',
  sector: '',
  geography: 'United States',
  dealType: 'First Lien Term Loan',
  securityType: 'Senior Secured',
  proposedAmountUsd: '',
  pipelineStage: 'IC pending',
  ebitdaUsd: '',
  revenueUsd: '',
  leverageMultiple: '',
  ltvPct: '',
  sponsored: false,
  coInvest: false,
  esgFlags: '',
  structureTags: '',
}

function num(v: string): number | undefined {
  const n = parseFloat(v.replace(/,/g, ''))
  return isNaN(n) ? undefined : n
}

function formFieldInputCls(err?: string) {
  return `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${err ? 'border-red-400' : 'border-[var(--color-border)]'} bg-[var(--color-surface)]`
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function DealList() {
  const { fundId } = useAppContext()
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(BLANK)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    let m = true
    setLoading(true)
    api.listDeals(fundId || undefined).then((d) => {
      if (!m) return
      setDeals(d)
      setLoading(false)
    })
    return () => { m = false }
  }, [fundId])

  function set(key: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) e.name = 'Deal name is required.'
    if (!form.sector) e.sector = 'Select a sector.'
    if (!form.geography.trim()) e.geography = 'Geography is required.'
    if (!form.proposedAmountUsd) e.proposedAmountUsd = 'Enter the proposed amount.'
    else if (isNaN(parseFloat(form.proposedAmountUsd))) e.proposedAmountUsd = 'Must be a number.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const deal = await api.createDeal({
        fundId: fundId ?? '',
        name: form.name.trim(),
        sector: form.sector,
        geography: form.geography.trim(),
        dealType: form.dealType || undefined,
        securityType: form.securityType || undefined,
        proposedAmountUsd: parseFloat(form.proposedAmountUsd.replace(/,/g, '')),
        pipelineStage: form.pipelineStage,
        ebitdaUsd: num(form.ebitdaUsd),
        revenueUsd: num(form.revenueUsd),
        leverageMultiple: num(form.leverageMultiple),
        ltvPct: num(form.ltvPct),
        sponsored: form.sponsored,
        coInvest: form.coInvest,
        esgFlags: form.esgFlags ? form.esgFlags.split(',').map((s) => s.trim()).filter(Boolean) : [],
        structureTags: form.structureTags ? form.structureTags.split(',').map((s) => s.trim()).filter(Boolean) : [],
        publicOrPrivate: 'private',
      })
      navigate(`/deals/${deal.id}/screening`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Deal Screening"
        description="Enter a deal, run the LP restriction check, and log the audit record before IC."
        actions={
          <Button onClick={() => { setForm(BLANK); setErrors({}); setShowForm(true) }}>
            + New deal
          </Button>
        }
      />

      {/* Deal table */}
      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Deal</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Sector / Geo</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Type</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Leverage</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Proposed</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Stage</th>
                <th className="px-4 py-3 font-medium text-[var(--color-ink-muted)]">Screening</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {deals.map((d) => (
                <tr key={d.id} className="hover:bg-[var(--color-surface-muted)]/60">
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">{d.name}</td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {d.sector}<br />
                    <span className="text-xs">{d.geography}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)] text-xs">{d.dealType ?? '—'}</td>
                  <td className="px-4 py-3">
                    {d.leverageMultiple !== undefined ? (
                      <span className={`font-medium text-sm ${d.leverageMultiple > 6.5 ? 'text-red-600' : d.leverageMultiple > 5.5 ? 'text-amber-600' : 'text-[var(--color-ink)]'}`}>
                        {d.leverageMultiple}x
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{formatUsd(d.proposedAmountUsd)}</td>
                  <td className="px-4 py-3"><Badge tone="neutral">{d.pipelineStage}</Badge></td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-[var(--color-accent)] hover:underline" to={`/deals/${d.id}/screening`}>
                      Screen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Deal slide-over */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />

          {/* Panel */}
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-[var(--color-surface)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">New Deal</h2>
                <p className="text-xs text-[var(--color-ink-muted)]">Fill in the deal details then run screening.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-[var(--color-surface-muted)]">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 px-6 py-5">

                {/* Deal identity */}
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Deal identity</p>

                <FormField label="Deal / Project name *" error={errors.name}>
                  <input className={formFieldInputCls(errors.name)} placeholder="e.g. Midstream Logistics Credit Facility" value={form.name} onChange={(e) => set('name', e.target.value)} />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Sector *" error={errors.sector}>
                    <select className={formFieldInputCls(errors.sector)} value={form.sector} onChange={(e) => set('sector', e.target.value)}>
                      <option value="">Select…</option>
                      {SECTORS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Geography *" error={errors.geography}>
                    <input className={formFieldInputCls(errors.geography)} placeholder="e.g. United States" value={form.geography} onChange={(e) => set('geography', e.target.value)} />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Pipeline stage">
                    <select className={formFieldInputCls()} value={form.pipelineStage} onChange={(e) => set('pipelineStage', e.target.value)}>
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Proposed amount ($) *" error={errors.proposedAmountUsd}>
                    <input className={formFieldInputCls(errors.proposedAmountUsd)} placeholder="e.g. 18000000" value={form.proposedAmountUsd} onChange={(e) => set('proposedAmountUsd', e.target.value)} />
                  </FormField>
                </div>

                {/* Deal structure */}
                <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Deal structure</p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Deal type">
                    <select className={formFieldInputCls()} value={form.dealType} onChange={(e) => set('dealType', e.target.value)}>
                      {DEAL_TYPES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Security type">
                    <select className={formFieldInputCls()} value={form.securityType} onChange={(e) => set('securityType', e.target.value)}>
                      {SECURITY_TYPES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </FormField>
                </div>

                <div className="flex gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.sponsored} onChange={(e) => set('sponsored', e.target.checked)} className="rounded" />
                    Sponsor-backed
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.coInvest} onChange={(e) => set('coInvest', e.target.checked)} className="rounded" />
                    Co-invest
                  </label>
                </div>

                {/* Financial metrics */}
                <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Financial metrics</p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Leverage multiple (x)">
                    <input className={formFieldInputCls()} placeholder="e.g. 4.5" value={form.leverageMultiple} onChange={(e) => set('leverageMultiple', e.target.value)} />
                  </FormField>
                  <FormField label="LTV (%)">
                    <input className={formFieldInputCls()} placeholder="e.g. 65" value={form.ltvPct} onChange={(e) => set('ltvPct', e.target.value)} />
                  </FormField>
                  <FormField label="LTM EBITDA ($)">
                    <input className={formFieldInputCls()} placeholder="e.g. 22000000" value={form.ebitdaUsd} onChange={(e) => set('ebitdaUsd', e.target.value)} />
                  </FormField>
                  <FormField label="LTM Revenue ($)">
                    <input className={formFieldInputCls()} placeholder="e.g. 95000000" value={form.revenueUsd} onChange={(e) => set('revenueUsd', e.target.value)} />
                  </FormField>
                </div>

                {/* Flags */}
                <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Flags</p>

                <FormField label="ESG flags (comma-separated)">
                  <input className={formFieldInputCls()} placeholder="e.g. coal_exposure, weapons" value={form.esgFlags} onChange={(e) => set('esgFlags', e.target.value)} />
                </FormField>
                <FormField label="Structure tags (comma-separated)">
                  <input className={formFieldInputCls()} placeholder="e.g. affiliate_sponsor, bridge_facility" value={form.structureTags} onChange={(e) => set('structureTags', e.target.value)} />
                </FormField>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Running screening…' : 'Run screening & log audit →'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
