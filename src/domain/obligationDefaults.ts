import type {
  ExtractedRestriction,
  LegalDocument,
  LegalInstrumentKind,
  ObligationKind,
} from './types'

export function suggestObligationKind(r?: ExtractedRestriction): ObligationKind {
  if (!r) return 'other'
  const text = `${r.category ?? ''} ${r.summary} ${r.clauseText ?? ''}`.toLowerCase()
  if (r.category === 'mfn' || text.includes('mfn') || text.includes('most favored')) {
    return 'mfn_election_window'
  }
  if (r.category === 'co_invest' || text.includes('co-invest') || text.includes('coinvest')) {
    return 'co_invest_allocation'
  }
  if (text.includes('consent')) return 'consent'
  if (
    r.category === 'reporting' ||
    text.includes('certif') ||
    text.includes('annual') ||
    text.includes('quarterly')
  ) {
    return 'reporting'
  }
  if (
    text.includes('notif') ||
    text.includes('notify') ||
    text.includes('notice') ||
    text.includes('within') && text.includes('days')
  ) {
    return 'notice'
  }
  return 'other'
}

export function obligationDraftFromRestriction(
  doc: LegalDocument,
  r: ExtractedRestriction,
): {
  title: string
  kind: ObligationKind
  instrumentKind: LegalInstrumentKind
  lpId: string | null
  dealId: string | null
  legalDocumentId: string
  sourceRestrictionId: string
  sectionRef?: string
  ownerRole: string
} {
  const title = r.summary.length > 120 ? `${r.summary.slice(0, 117)}…` : r.summary
  return {
    title,
    kind: suggestObligationKind(r),
    instrumentKind: doc.kind,
    lpId: doc.lpId,
    dealId: doc.dealId,
    legalDocumentId: doc.id,
    sourceRestrictionId: r.id,
    sectionRef: r.sectionRef,
    ownerRole: 'Compliance',
  }
}

export function effectiveObligationStatus(
  status: 'open' | 'done' | 'waived' | 'overdue',
  dueAt: string | null,
): 'open' | 'done' | 'waived' | 'overdue' {
  if (status !== 'open' || !dueAt) return status
  if (new Date(dueAt).getTime() < Date.now()) return 'overdue'
  return status
}
