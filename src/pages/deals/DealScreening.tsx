import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type {
  Deal,
  ExtractedRestriction,
  LimitedPartner,
  ScreeningOutcome,
  ScreeningRun,
} from '../../domain/types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from '../../components/ui'
import { useFlash } from '../../components/Flash'
import { PERSONA_LABEL } from '../../domain/personas'
import { INSTRUMENT_LABEL, PRECEDENCE_POLICY_NOTE } from '../../domain/legal'
import { useAppContext } from '../../context/AppContext'
import { formatDate, formatUsd } from '../../util/format'

export function DealScreening() {
  const { dealId } = useParams<{ dealId: string }>()
  const { persona } = useAppContext()
  const flash = useFlash()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [lps, setLps] = useState<LimitedPartner[]>([])
  const [restrictions, setRestrictions] = useState<ExtractedRestriction[]>(
    [],
  )
  const [run, setRun] = useState<ScreeningRun | null>(null)
  const [failOnly, setFailOnly] = useState(false)
  const [selectedLpId, setSelectedLpId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dealId) return
    let m = true
    ;(async () => {
      const [d, lp, r] = await Promise.all([
        api.getDeal(dealId),
        api.listLPs(),
        api.listRestrictions(),
      ])
      if (!m) return
      setDeal(d ?? null)
      setLps(lp)
      setRestrictions(r)
      const preview = await api.evaluateScreeningOnly(dealId)
      if (!m) return
      setRun(preview)
      setLoading(false)
    })()
    return () => {
      m = false
    }
  }, [dealId])

  const lpMap = useMemo(
    () => Object.fromEntries(lps.map((x) => [x.id, x])),
    [lps],
  )

  async function runOfficial() {
    if (!dealId) return
    setRunning(true)
    try {
      const out = await api.runScreening(dealId, PERSONA_LABEL[persona])
      setRun(out)
      if (out)
        flash('Screening run logged — check Compliance → Audit log.')
    } finally {
      setRunning(false)
    }
  }

  function outcomeTone(o: ScreeningOutcome) {
    if (o === 'eligible') return 'success' as const
    if (o === 'ineligible') return 'danger' as const
    return 'warning' as const
  }

  function restrictionById(id: string) {
    return restrictions.find((x) => x.id === id)
  }

  if (!dealId) return <EmptyState title="Missing deal id" />

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>

  if (!deal)
    return (
      <EmptyState title="Deal not found" hint="Return to pipeline list." />
    )

  const rows =
    run?.results.filter((row) => {
      if (!failOnly) return true
      return row.outcome !== 'eligible'
    }) ?? []

  const activeLpId = selectedLpId ?? rows[0]?.lpId ?? null
  const selected = rows.find((x) => x.lpId === activeLpId)

  return (
    <div>
      <PageHeader
        title={deal.name}
        description={`Automated restriction screening · proposed allocation ${formatUsd(deal.proposedAmountUsd)}`}
        actions={
          <>
            <Button variant="secondary" disabled>
              Export packet (stub)
            </Button>
            <Button disabled={running} onClick={runOfficial}>
              {running ? 'Running…' : 'Run screening & log audit'}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
        <div>
          <span className="text-[var(--color-ink-muted)]">Sector </span>
          <span className="font-medium">{deal.sector}</span>
        </div>
        <div>
          <span className="text-[var(--color-ink-muted)]">Geography </span>
          <span className="font-medium">{deal.geography}</span>
        </div>
        <div>
          <span className="text-[var(--color-ink-muted)]">ESG flags </span>
          <span className="font-medium">
            {deal.esgFlags.length ? deal.esgFlags.join(', ') : 'None'}
          </span>
        </div>
        <div>
          <span className="text-[var(--color-ink-muted)]">Structure tags </span>
          <span className="font-medium">
            {deal.structureTags?.length
              ? deal.structureTags.join(', ')
              : 'None'}
          </span>
        </div>
        <div>
          <span className="text-[var(--color-ink-muted)]">Stage </span>
          <Badge tone="neutral">{deal.pipelineStage}</Badge>
        </div>
      </div>

      <Card title="Instrument precedence" subtitle="How overlapping LPA / side letter / ERISA / MFN terms are ordered for mock screening." className="mb-6">
        <p className="text-sm text-[var(--color-ink-muted)]">{PRECEDENCE_POLICY_NOTE}</p>
      </Card>

      {run ? (
        <Card
          title="Compliance verification banner"
          subtitle="Evidence captured before IC — hashes are stubs pending backend immutability."
        >
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <span className="text-[var(--color-ink-muted)]">Screening run </span>
              <span className="font-mono text-xs">{run.id}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink-muted)]">Run at </span>
              <span>{formatDate(run.runAt)}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink-muted)]">Actor </span>
              <span>{run.runBy}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink-muted)]">Inputs hash </span>
              <span className="break-all font-mono text-xs">{run.inputsHash}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink-muted)]">Rule pack </span>
              <span className="font-mono text-xs">{run.rulePackVersion}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-ink-muted)]">Verified before IC </span>
              <Badge tone={run.verifiedBeforeIc ? 'success' : 'warning'}>
                {run.verifiedBeforeIc ? 'Yes (mock)' : 'Pending'}
              </Badge>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card
          title="Eligibility matrix"
          subtitle="LP × restriction outcome — filter to failures only."
          className="lg:col-span-3"
          actions={
            <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
              <input
                type="checkbox"
                checked={failOnly}
                onChange={(e) => setFailOnly(e.target.checked)}
              />
              Fail / review only
            </label>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                  <th className="pb-2 pr-4 font-medium">LP</th>
                  <th className="pb-2 pr-4 font-medium">Outcome</th>
                  <th className="pb-2 font-medium">Hits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {rows.map((row) => (
                  <tr
                    key={row.lpId}
                    className={
                      activeLpId === row.lpId
                        ? 'bg-[var(--color-accent-muted)]/35'
                        : 'cursor-pointer hover:bg-[var(--color-surface-muted)]'
                    }
                    onClick={() => setSelectedLpId(row.lpId)}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {lpMap[row.lpId]?.name ?? row.lpId}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone={outcomeTone(row.outcome)}>{row.outcome}</Badge>
                    </td>
                    <td className="py-2 text-[var(--color-ink-muted)]">
                      {row.hits.length ? `${row.hits.length} restriction(s)` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Why blocked / review"
          subtitle="Citations include instrument type, precedence rank, and link to source document."
          className="lg:col-span-2"
        >
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase text-[var(--color-ink-muted)]">
                  Selected LP
                </div>
                <div className="text-base font-semibold">
                  {lpMap[selected.lpId]?.name}
                </div>
                <div className="mt-2">
                  <Badge tone={outcomeTone(selected.outcome)}>
                    {selected.outcome}
                  </Badge>
                </div>
              </div>
              {selected.hits.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  No blocking restrictions matched mock logic for this deal profile.
                </p>
              ) : (
                <ul className="space-y-3">
                  {selected.hits.map((h) => {
                    const r = restrictionById(h.restrictionId)
                    return (
                      <li
                        key={h.restrictionId}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3"
                      >
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="neutral" className="font-mono">
                            {h.restrictionId}
                          </Badge>
                          <Badge tone="accent">
                            {INSTRUMENT_LABEL[h.instrumentKind]}
                          </Badge>
                          <Badge tone="neutral" className="font-mono text-[10px]">
                            rank {h.precedenceRank}
                          </Badge>
                          <Link
                            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                            to={`/instruments/${h.legalDocumentId}`}
                          >
                            {h.instrumentTitle}
                          </Link>
                          {r ? (
                            <>
                              <Badge tone="neutral">{r.category}</Badge>
                              <Badge
                                tone={
                                  r.reviewStatus === 'confirmed'
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {r.reviewStatus === 'draft'
                                  ? 'Extracted'
                                  : 'Confirmed'}
                              </Badge>
                            </>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">
                          {h.reason}
                        </p>
                        {r ? (
                          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                            Clause text: {r.summary}
                            {r.sectionRef ? ` (${r.sectionRef})` : ''}
                          </p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : (
            <EmptyState title="Select an LP row" />
          )}
        </Card>
      </div>

      <div className="mt-8">
        <Link className="text-sm font-medium text-[var(--color-accent)] hover:underline" to="/deals">
          ← Deals pipeline
        </Link>
      </div>
    </div>
  )
}
