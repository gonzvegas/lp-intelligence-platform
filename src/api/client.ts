import type {
  Allocation,
  AuditEvent,
  CapacitySnapshot,
  Deal,
  ExtractedRestriction,
  Fund,
  IntegrationStatus,
  LegalDocument,
  LimitedPartner,
  Obligation,
  ReportJob,
  Role,
  ScreeningRun,
  SectorConcentrationRule,
  SideLetterDocument,
  SignOff,
  UserAccount,
} from '../domain/types'
import * as handlers from '../mocks/handlers'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

// ---------------------------------------------------------------------------
// Mock helpers (kept for mock path)
// ---------------------------------------------------------------------------

const delayMs = 280
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delayMs))
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function get<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(`${API_URL}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v)
    }
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Backend → frontend mappers (snake_case → camelCase)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLp(r: any): LimitedPartner {
  return {
    id: r.id,
    fundId: r.fund_id ?? '',
    name: r.name,
    investorType: r.entity_type ?? 'unknown',
    commitmentUsd: r.commitment_usd ?? 0,
    fundedUsd: r.funded_usd ?? 0,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDeal(r: any): Deal {
  return {
    id: r.id,
    fundId: r.fund_id ?? '',
    name: r.name,
    sector: r.sector ?? '',
    geography: r.geography ?? '',
    esgFlags: r.esg_flags ?? [],
    structureTags: r.structure_tags ?? [],
    proposedAmountUsd: r.proposed_amount_usd ?? 0,
    pipelineStage: r.stage ?? r.status ?? 'pipeline',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocument(r: any): LegalDocument {
  return {
    id: r.id,
    fundId: r.fund_id ?? '',
    lpId: r.lp_id ?? null,
    dealId: null,
    kind: r.instrument_kind ?? 'lpa',
    title: r.title,
    uploadedAt: r.uploaded_at,
    reviewStatus: r.status === 'needs_review' ? 'extracted' : r.status === 'confirmed' ? 'confirmed' : 'processing',
    restrictionIds: [],
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRestriction(r: any): ExtractedRestriction {
  return {
    id: r.id,
    lpId: r.lp_id ?? null,
    legalDocumentId: r.legal_document_id,
    instrumentKind: r.instrument_kind ?? 'lpa',
    precedenceRank: r.precedence_rank ?? 50,
    category: r.category ?? 'other',
    severity: r.severity ?? 'soft',
    summary: r.summary,
    clauseText: r.clause_text ?? undefined,
    rawQuote: r.clause_text ?? undefined,
    effectiveFrom: r.created_at ?? new Date().toISOString(),
    reviewStatus: r.review_status ?? 'draft',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFund(r: any): Fund {
  return {
    id: r.id,
    externalId: r.external_id ?? null,
    name: r.name,
    vintage: r.vintage ?? null,
    strategy: r.strategy ?? null,
    targetSizeUsd: r.target_size_usd ?? null,
    currency: r.currency ?? 'USD',
    status: r.status ?? 'fundraising',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAllocation(r: any): Allocation {
  return {
    id: r.id,
    lpId: r.lp_id,
    dealId: r.deal_id ?? `manual-${r.id}`,
    dealName: r.deal_name,
    sector: r.sector ?? '',
    amountUsd: r.amount_usd ?? 0,
    closedAt: r.closed_at ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIntegration(r: any): IntegrationStatus {
  return {
    id: r.id,
    name: r.provider.charAt(0).toUpperCase() + r.provider.slice(1),
    connected: r.connected,
    lastSyncAt: r.last_sync_at ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const api = {
  // --- Funds ---
  async listFunds(): Promise<Fund[]> {
    if (USE_MOCKS) return delay([])
    const rows = await get<unknown[]>('/funds')
    return rows.map(mapFund)
  },

  async createFund(body: { name: string; vintage?: string; strategy?: string; targetSizeUsd?: number; currency?: string; status?: string }): Promise<Fund> {
    const r = await post<unknown>('/funds', {
      name: body.name,
      vintage: body.vintage,
      strategy: body.strategy,
      target_size_usd: body.targetSizeUsd,
      currency: body.currency ?? 'USD',
      status: body.status ?? 'fundraising',
    })
    return mapFund(r)
  },

  async createLP(body: { name: string; fundId?: string; entityType?: string; jurisdiction?: string; commitmentUsd?: number }): Promise<LimitedPartner> {
    const r = await post<unknown>('/lps', {
      name: body.name,
      fund_id: body.fundId,
      entity_type: body.entityType,
      jurisdiction: body.jurisdiction,
      commitment_usd: body.commitmentUsd ?? 0,
      funded_usd: 0,
    })
    return mapLp(r)
  },

  async updateLP(lpId: string, body: { name?: string; fundId?: string; entityType?: string; jurisdiction?: string; commitmentUsd?: number; fundedUsd?: number }): Promise<LimitedPartner | null> {
    if (USE_MOCKS) return delay(handlers.updateLpCommitment(lpId, body.commitmentUsd ?? 0, body.fundedUsd ?? 0) ?? null)
    try {
      const r = await patch<unknown>(`/lps/${lpId}`, {
        name: body.name,
        fund_id: body.fundId,
        entity_type: body.entityType,
        jurisdiction: body.jurisdiction,
        commitment_usd: body.commitmentUsd,
        funded_usd: body.fundedUsd,
      })
      return mapLp(r)
    } catch { return null }
  },

  // --- Allocations ---
  async allocationsForLpReal(lpId: string): Promise<Allocation[]> {
    if (USE_MOCKS) return delay(handlers.allocationsForLp(lpId))
    const rows = await get<unknown[]>('/allocations', { lp_id: lpId })
    return rows.map(mapAllocation)
  },

  async addAllocationReal(lpId: string, dealName: string, sector: string, amountUsd: number, closedAt: string, fundId?: string): Promise<Allocation> {
    if (USE_MOCKS) return delay(handlers.addAllocation(lpId, dealName, sector, amountUsd, closedAt))
    const r = await post<unknown>('/allocations', { lp_id: lpId, deal_name: dealName, sector, amount_usd: amountUsd, closed_at: closedAt, fund_id: fundId })
    return mapAllocation(r)
  },

  async removeAllocationReal(allocationId: string): Promise<boolean> {
    if (USE_MOCKS) return delay(handlers.removeAllocation(allocationId))
    try {
      const res = await fetch(`${API_URL}/allocations/${allocationId}`, { method: 'DELETE' })
      return res.ok
    } catch { return false }
  },

  // --- Deals ---
  async listDeals(fundId?: string): Promise<Deal[]> {
    if (USE_MOCKS) return delay(handlers.listDeals(fundId))
    // Real backend: don't filter by mock fund IDs — return all deals
    const rows = await get<unknown[]>('/deals')
    return rows.map(mapDeal)
  },

  async getDeal(id: string): Promise<Deal | undefined> {
    if (USE_MOCKS) return delay(handlers.getDealById(id))
    try {
      const r = await get<unknown>(`/deals/${id}`)
      return mapDeal(r)
    } catch { return undefined }
  },

  // --- LPs ---
  async listLPs(fundId?: string): Promise<LimitedPartner[]> {
    if (USE_MOCKS) return delay(handlers.listLPs(fundId))
    // Real backend: don't filter by mock fund IDs — return all LPs
    const rows = await get<unknown[]>('/lps')
    return rows.map(mapLp)
  },

  async getLp(id: string): Promise<LimitedPartner | undefined> {
    if (USE_MOCKS) return delay(handlers.getLpById(id))
    try {
      const r = await get<unknown>(`/lps/${id}`)
      return mapLp(r)
    } catch { return undefined }
  },

  // --- Legal Documents ---
  async listLegalDocuments(_fundId?: string): Promise<LegalDocument[]> {
    if (USE_MOCKS) return delay(handlers.listLegalDocuments(_fundId))
    // Real backend: return all documents
    const rows = await get<unknown[]>('/documents')
    return rows.map(mapDocument)
  },

  async getLegalDocument(id: string): Promise<LegalDocument | undefined> {
    if (USE_MOCKS) return delay(handlers.getLegalDocumentById(id))
    try {
      const r = await get<unknown>(`/documents/${id}`)
      return mapDocument(r)
    } catch { return undefined }
  },

  listSideLetters(): Promise<SideLetterDocument[]> {
    return delay(handlers.listSideLetters())
  },

  getSideLetter(id: string): Promise<LegalDocument | undefined> {
    return delay(handlers.getLegalDocumentById(id))
  },

  // --- Restrictions ---
  async listRestrictions(): Promise<ExtractedRestriction[]> {
    if (USE_MOCKS) return delay(handlers.listRestrictions())
    const rows = await get<unknown[]>('/restrictions')
    return rows.map(mapRestriction)
  },

  async restrictionsForLp(lpId: string): Promise<ExtractedRestriction[]> {
    if (USE_MOCKS) return delay(handlers.restrictionsForLp(lpId))
    const rows = await get<unknown[]>('/restrictions', { lp_id: lpId })
    return rows.map(mapRestriction)
  },

  async reviewRestriction(restrictionId: string, action: 'confirm' | 'reject'): Promise<ExtractedRestriction | null> {
    if (USE_MOCKS) {
      const r = handlers.listRestrictions().find((x) => x.id === restrictionId)
      if (!r) return delay(null)
      r.reviewStatus = action === 'confirm' ? 'confirmed' : 'rejected'
      return delay(r)
    }
    try {
      const r = await patch<unknown>(`/restrictions/${restrictionId}/${action}`)
      return mapRestriction(r)
    } catch { return null }
  },

  // --- Integrations ---
  async listIntegrations(): Promise<IntegrationStatus[]> {
    if (USE_MOCKS) return delay(handlers.listIntegrations())
    const rows = await get<unknown[]>('/integrations')
    return rows.map(mapIntegration)
  },

  async triggerDealCloudSync(): Promise<void> {
    if (USE_MOCKS) return
    await post('/integrations/dealcloud/sync')
  },

  toggleIntegration(id: string): Promise<IntegrationStatus | null> {
    return delay(handlers.toggleIntegration(id) ?? null)
  },

  // --- Everything below stays on mocks until Phase 6 ---

  listObligations(): Promise<Obligation[]> {
    return delay(handlers.listObligations())
  },

  completeObligation(id: string, actor: string): Promise<Obligation | null> {
    return delay(handlers.completeObligation(id, actor) ?? null)
  },

  allocationsForLp(lpId: string): Promise<Allocation[]> {
    return delay(handlers.allocationsForLp(lpId))
  },

  addAllocation(lpId: string, dealName: string, sector: string, amountUsd: number, closedAt: string): Promise<Allocation> {
    return delay(handlers.addAllocation(lpId, dealName, sector, amountUsd, closedAt))
  },

  updateAllocation(allocationId: string, patch: { dealName?: string; sector?: string; amountUsd?: number; closedAt?: string }): Promise<Allocation | null> {
    return delay(handlers.updateAllocation(allocationId, patch) ?? null)
  },

  removeAllocation(allocationId: string): Promise<boolean> {
    return delay(handlers.removeAllocation(allocationId))
  },

  sectorBreakdownForLp(lpId: string): Promise<Array<{ sector: string; amountUsd: number; pct: number }>> {
    return delay(handlers.sectorBreakdownForLp(lpId))
  },

  listSectorConcentrationRules(lpId?: string): Promise<SectorConcentrationRule[]> {
    return delay(handlers.listSectorConcentrationRules(lpId))
  },

  updateLpCommitment(lpId: string, commitmentUsd: number, fundedUsd: number): Promise<LimitedPartner | null> {
    return delay(handlers.updateLpCommitment(lpId, commitmentUsd, fundedUsd) ?? null)
  },

  capacitySnapshot(lpId: string): Promise<CapacitySnapshot | null> {
    const lp = handlers.getLpById(lpId)
    return delay(lp ? handlers.capacitySnapshotForLp(lp) : null)
  },

  runScreening(dealId: string, runBy: string): Promise<ScreeningRun | null> {
    const deal = handlers.getDealById(dealId)
    if (!deal) return delay(null)
    const run = handlers.createScreeningRun(deal, runBy)
    handlers.appendAuditEvent({
      at: run.runAt,
      actor: run.runBy,
      persona: 'gp',
      type: 'screening_run',
      summary: `Screening run ${run.id} for ${deal.name} — inputs hash ${run.inputsHash}.`,
      entityRef: run.id,
    })
    return delay(run)
  },

  evaluateScreeningOnly(dealId: string): Promise<ScreeningRun | null> {
    const deal = handlers.getDealById(dealId)
    if (!deal) return delay(null)
    const run = handlers.createScreeningRun(deal, 'Preview')
    return delay(run)
  },

  listAuditEvents(): Promise<AuditEvent[]> {
    return delay(handlers.listAuditEvents())
  },

  listSignOffs(): Promise<SignOff[]> {
    return delay(handlers.listSignOffs())
  },

  updateSignOff(id: string, status: SignOff['status'], actor: string): Promise<SignOff | null> {
    const rows = handlers.listSignOffs()
    const row = rows.find((s) => s.id === id)
    if (!row) return delay(null)
    row.status = status
    handlers.appendAuditEvent({
      at: new Date().toISOString(),
      actor,
      persona: 'compliance',
      type: 'sign_off',
      summary: `Sign-off ${id} marked ${status}.`,
      entityRef: id,
    })
    return delay(row)
  },

  listReportJobs(): Promise<ReportJob[]> {
    return delay(handlers.listReportJobs())
  },

  listUsers(): Promise<UserAccount[]> {
    return delay(handlers.listUsers())
  },

  setUserRoles(userId: string, roleIds: string[]): Promise<UserAccount | null> {
    return delay(handlers.setUserRoles(userId, roleIds) ?? null)
  },

  listRoles(): Promise<Role[]> {
    return delay(handlers.listRoles())
  },
}
