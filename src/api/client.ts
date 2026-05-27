import type {
  Allocation,
  AuditEvent,
  CapacitySnapshot,
  Deal,
  ExtractedRestriction,
  Fund,
  IntegrationStatus,
  LegalDocument,
  LegalInstrumentKind,
  LimitedPartner,
  Obligation,
  CreateObligationInput,
  ReportJob,
  Role,
  ScreeningRun,
  SectorConcentrationRule,
  SideLetterDocument,
  SignOff,
  SyncJob,
  UserAccount,
} from '../domain/types'
import {
  clearFundInstrumentOrder,
  clearLpInstrumentOrder,
  getFundInstrumentOrder,
  getEffectiveInstrumentOrder,
  getLpInstrumentOrderOverride,
  setFundInstrumentOrder,
  setLpInstrumentOrder,
} from '../domain/instrumentPrecedenceStorage'
import {
  computeCapacitySnapshot,
  computeSectorBreakdown,
  DEFAULT_SINGLE_DEAL_CAP_PCT,
} from '../domain/capacityCompute'
import {
  createScreeningRun as createScreeningRunFromDeal,
  type ScreeningContext,
} from '../domain/screeningEvaluate'
import * as handlers from '../mocks/handlers'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export { USE_MOCKS }

type AccessTokenProvider = () => Promise<string | null>
type ActorHeadersProvider = () => { name: string; persona: string } | null

let accessTokenProvider: AccessTokenProvider | null = null
let actorHeadersProvider: ActorHeadersProvider | null = null

/** When Entra JWT is enforced on FastAPI, register a silent token provider (runs under MSAL). */
export function setApiAccessTokenProvider(provider: AccessTokenProvider | null): void {
  accessTokenProvider = provider
}

/** Sends X-Actor-Name / X-Actor-Persona on API requests for audit logging. */
export function setApiActorHeadersProvider(provider: ActorHeadersProvider | null): void {
  actorHeadersProvider = provider
}

async function buildHeaders(base?: HeadersInit): Promise<Headers> {
  const h = base instanceof Headers ? new Headers(base) : new Headers(base ?? undefined)
  const actor = actorHeadersProvider?.()
  if (actor?.name) h.set('X-Actor-Name', actor.name)
  if (actor?.persona) h.set('X-Actor-Persona', actor.persona)
  if (accessTokenProvider) {
    try {
      const t = await Promise.race([
        accessTokenProvider(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ])
      if (t) h.set('Authorization', `Bearer ${t}`)
    } catch {
      /* ignore auth helper failures — request proceeds without Bearer */
    }
  }
  return h
}

const API_FETCH_TIMEOUT_MS = 20_000

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`Request timed out after ${API_FETCH_TIMEOUT_MS / 1000}s`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/** In dev, default `/api` so Vite proxies to FastAPI (avoids browser CORS). Set VITE_API_URL for a full URL override. */
function getApiBase(): string {
  const env = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (env) return env.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/api'
  return 'http://localhost:8000'
}

function apiAbsoluteUrl(path: string): string {
  const base = getApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}${p}`
  }
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const prefix = base.startsWith('/') ? base : `/${base}`
  return `${origin}${prefix}${p}`
}

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
  const url = new URL(apiAbsoluteUrl(path))
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v)
    }
  }
  const res = await apiFetch(url.toString(), { headers: await buildHeaders() })
  if (!res.ok) {
    const detail = await readResponseErrorDetail(res)
    const msg =
      detail && !detail.includes(String(res.status)) ? `${res.status}: ${detail}` : `GET ${path} → ${res.status}`
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(apiAbsoluteUrl(path), {
    method: 'POST',
    headers: await buildHeaders({ 'Content-Type': 'application/json' }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await readResponseErrorDetail(res)
    const msg =
      detail && !detail.includes(String(res.status)) ? `${res.status}: ${detail}` : `POST ${path} → ${res.status}`
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

async function readResponseErrorDetail(res: Response): Promise<string> {
  let text = ''
  try {
    text = await res.text()
  } catch {
    return res.statusText || String(res.status)
  }
  if (!text.trim()) return res.statusText || String(res.status)
  try {
    const j = JSON.parse(text) as { detail?: unknown }
    const d = j.detail
    if (typeof d === 'string') return d
    if (Array.isArray(d))
      return d
        .map((v) => {
          if (typeof v === 'object' && v !== null && 'msg' in v) return String((v as { msg: unknown }).msg)
          try {
            return JSON.stringify(v)
          } catch {
            return String(v)
          }
        })
        .join('; ')
  } catch {
    /* plain text body */
  }
  return text.length > 500 ? `${text.slice(0, 500)}…` : text
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(apiAbsoluteUrl(path), {
    method: 'PATCH',
    headers: await buildHeaders({ 'Content-Type': 'application/json' }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await readResponseErrorDetail(res)
    throw new Error(detail.includes(String(res.status)) ? detail : `${res.status}: ${detail}`)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Backend → frontend mappers (snake_case → camelCase)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLp(r: any): LimitedPartner {
  return {
    id: r.id,
    externalId: r.external_id ?? null,
    fundId: r.fund_id ?? '',
    name: r.name,
    investorType: r.entity_type ?? 'unknown',
    jurisdiction: r.jurisdiction ?? null,
    lpStatus: r.status ?? 'active',
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
    ebitdaUsd: r.ebitda_usd ?? undefined,
    revenueUsd: r.revenue_usd ?? undefined,
    leverageMultiple: r.leverage_multiple ?? undefined,
    ltvPct: r.ltv_pct ?? undefined,
    attachmentPoint: r.attachment_point ?? undefined,
    detachmentPoint: r.detachment_point ?? undefined,
    dealType: r.deal_type ?? undefined,
    securityType: r.security_type ?? undefined,
    sponsored: r.sponsored ?? undefined,
    coInvest: r.co_invest ?? undefined,
    publicOrPrivate:
      r.public_or_private === 'public'
        ? 'public'
        : r.public_or_private === 'private'
          ? 'private'
          : undefined,
  }
}

function mapDocumentReviewStatus(status: string): LegalDocument['reviewStatus'] {
  if (status === 'needs_review' || status === 'completed') return 'extracted'
  if (status === 'confirmed') return 'confirmed'
  return 'processing'
}

function documentPipelineStageFromStatus(status: string): LegalDocument['pipelineStage'] | undefined {
  if (status === 'needs_review') return 'extracted'
  if (status === 'confirmed' || status === 'active') return 'active'
  if (status === 'processing') return 'parsing'
  return undefined
}

function sanitizeIngestionSource(raw: unknown): LegalDocument['ingestionSource'] {
  const v = String(raw ?? 'manual').toLowerCase()
  if (v === 'dealcloud' || v === 'csv_import' || v === 'manual') return v
  return 'manual'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocument(r: any): LegalDocument {
  const status = String(r.status ?? 'pending')
  return {
    id: r.id,
    fundId: r.fund_id ?? '',
    lpId: r.lp_id ?? null,
    dealId: r.deal_id ?? null,
    kind: r.instrument_kind ?? 'lpa',
    title: r.title,
    uploadedAt: r.uploaded_at,
    reviewStatus: mapDocumentReviewStatus(status),
    restrictionIds: [],
    versionNumber: r.version_number ?? 1,
    supersedesDocumentId: r.supersedes_document_id ?? null,
    replacedByDocumentId: r.replaced_by_document_id ?? null,
    effectiveFrom: r.effective_from ?? undefined,
    ingestionSource: sanitizeIngestionSource(r.source ?? r.ingestion_source),
    pipelineStage: documentPipelineStageFromStatus(status),
    hasContent: Boolean(r.has_content),
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
    pageNum: r.page_num ?? undefined,
    sectionRef: r.section_ref ?? undefined,
    documentVersionNumber: r.document_version_number ?? undefined,
    extractionBatchId: r.extraction_batch_id ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapObligation(r: any): Obligation {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind ?? 'other',
    instrumentKind: r.instrument_kind ?? 'lpa',
    lpId: r.lp_id ?? null,
    dealId: r.deal_id ?? null,
    legalDocumentId: r.legal_document_id,
    sourceRestrictionId: r.source_restriction_id ?? undefined,
    sectionRef: r.section_ref ?? undefined,
    dueAt: r.due_at ?? null,
    recurrence: r.recurrence ?? undefined,
    ownerRole: r.owner_role ?? 'Compliance',
    status: r.status ?? 'open',
    evidenceNote: r.evidence_note ?? undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at ?? undefined,
  }
}

export type { CreateObligationInput }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuditEvent(r: any): AuditEvent {
  return {
    id: r.id,
    at: r.at,
    actor: r.actor,
    persona: r.persona ?? 'admin',
    type: r.type,
    summary: r.summary,
    entityRef: r.entity_ref ?? undefined,
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
  const p = r.provider as string | undefined
  const pretty =
    p && p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : ''
  return {
    id: r.id,
    name: pretty || (r.name as string) || '',
    connected: r.connected,
    lastSyncAt: r.last_sync_at ?? undefined,
    lastSyncStatus: r.last_sync_status ?? undefined,
    lastSyncDetail: r.last_sync_detail ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const api = {
  // --- Funds ---
  async listFunds(): Promise<Fund[]> {
    if (USE_MOCKS) return delay(handlers.listFunds())
    const rows = await get<unknown[]>('/funds')
    return rows.map(mapFund)
  },

  async createFund(body: { name: string; vintage?: string; strategy?: string; targetSizeUsd?: number; currency?: string; status?: string }): Promise<Fund> {
    if (USE_MOCKS) {
      return delay(
        handlers.createFund({
          name: body.name,
          vintage: body.vintage ?? null,
          strategy: body.strategy ?? null,
          targetSizeUsd: body.targetSizeUsd ?? null,
          currency: body.currency ?? 'USD',
          status: body.status ?? 'fundraising',
        }),
      )
    }
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

  async updateFund(
    fundId: string,
    body: {
      name: string
      vintage?: string
      strategy?: string
      targetSizeUsd?: number | null
      currency?: string
      status?: string
    },
  ): Promise<Fund | null> {
    if (USE_MOCKS) {
      return delay(
        handlers.updateFund(fundId, {
          name: body.name,
          vintage: body.vintage ?? null,
          strategy: body.strategy ?? null,
          targetSizeUsd: body.targetSizeUsd ?? null,
          currency: body.currency ?? 'USD',
          status: body.status ?? 'fundraising',
        }) ?? null,
      )
    }
    const r = await patch<unknown>(`/funds/${encodeURIComponent(fundId)}`, {
      name: body.name,
      vintage: body.vintage ?? null,
      strategy: body.strategy?.trim() ? body.strategy : null,
      target_size_usd: body.targetSizeUsd,
      currency: body.currency ?? 'USD',
      status: body.status ?? 'fundraising',
    })
    return mapFund(r)
  },

  async createLP(body: { name: string; fundId?: string; entityType?: string; jurisdiction?: string; commitmentUsd?: number }): Promise<LimitedPartner> {
    if (USE_MOCKS) {
      return delay(
        handlers.createLimitedPartner({
          name: body.name,
          fundId: body.fundId,
          entityType: body.entityType,
          commitmentUsd: body.commitmentUsd,
        }),
      )
    }
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
    if (USE_MOCKS) {
      const patch: Parameters<typeof handlers.updateLimitedPartner>[1] = {}
      if (body.name !== undefined) patch.name = body.name
      if (body.fundId !== undefined) patch.fundId = body.fundId
      if (body.entityType !== undefined) patch.entityType = body.entityType
      if (body.commitmentUsd !== undefined) patch.commitmentUsd = body.commitmentUsd
      if (body.fundedUsd !== undefined) patch.fundedUsd = body.fundedUsd
      return delay(handlers.updateLimitedPartner(lpId, patch) ?? null)
    }
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
      const res = await apiFetch(apiAbsoluteUrl(`/allocations/${allocationId}`), {
        method: 'DELETE',
        headers: await buildHeaders(),
      })
      return res.ok
    } catch { return false }
  },

  async updateAllocationReal(
    allocationId: string,
    updates: { dealName?: string; sector?: string; amountUsd?: number; closedAt?: string },
  ): Promise<Allocation | null> {
    if (USE_MOCKS) return delay(handlers.updateAllocation(allocationId, updates) ?? null)
    try {
      const r = await patch<unknown>(`/allocations/${encodeURIComponent(allocationId)}`, {
        deal_name: updates.dealName,
        sector: updates.sector,
        amount_usd: updates.amountUsd,
        closed_at: updates.closedAt,
      })
      return mapAllocation(r)
    } catch {
      return null
    }
  },

  // --- Deals ---
  async listDeals(fundId?: string): Promise<Deal[]> {
    if (USE_MOCKS) return delay(handlers.listDeals(fundId))
    const rows = await get<unknown[]>('/deals', fundId ? { fund_id: fundId } : undefined)
    return rows.map(mapDeal)
  },

  async getDeal(id: string): Promise<Deal | undefined> {
    if (USE_MOCKS) return delay(handlers.getDealById(id))
    try {
      const r = await get<unknown>(`/deals/${id}`)
      return mapDeal(r)
    } catch { return undefined }
  },

  async createDeal(input: Omit<Deal, 'id'>): Promise<Deal> {
    if (USE_MOCKS) return delay(handlers.createDeal(input))

    function toUsdInt(n: number | undefined): number | undefined {
      if (n === undefined || n === null || Number.isNaN(n)) return undefined
      return Math.round(n)
    }

    const r = await post<unknown>('/deals', {
      name: input.name,
      fund_id: input.fundId?.trim() ? input.fundId : null,
      sector: input.sector || null,
      geography: input.geography || null,
      stage: input.pipelineStage || null,
      status: 'pipeline',
      proposed_amount_usd: Math.round(Number(input.proposedAmountUsd)) || 0,
      structure_tags: input.structureTags ?? null,
      esg_flags: input.esgFlags ?? null,
      deal_type: input.dealType ?? null,
      security_type: input.securityType ?? null,
      ebitda_usd: toUsdInt(input.ebitdaUsd),
      revenue_usd: toUsdInt(input.revenueUsd),
      leverage_multiple: input.leverageMultiple,
      ltv_pct: input.ltvPct,
      attachment_point: input.attachmentPoint,
      detachment_point: input.detachmentPoint,
      sponsored: input.sponsored,
      co_invest: input.coInvest,
      public_or_private: input.publicOrPrivate ?? null,
    })
    return mapDeal(r)
  },

  async getInstrumentPrecedence(fundId: string): Promise<LegalInstrumentKind[]> {
    if (USE_MOCKS) return delay([...getFundInstrumentOrder(fundId)])
    return []
  },

  async saveInstrumentPrecedence(
    fundId: string,
    order: LegalInstrumentKind[],
  ): Promise<void> {
    if (USE_MOCKS) {
      setFundInstrumentOrder(fundId, order)
      return delay(undefined)
    }
    await post(`/funds/${encodeURIComponent(fundId)}/instrument-precedence`, {
      instrument_order: order,
    })
  },

  async clearInstrumentPrecedence(fundId: string): Promise<void> {
    if (USE_MOCKS) {
      clearFundInstrumentOrder(fundId)
      return delay(undefined)
    }
    try {
      await apiFetch(
        apiAbsoluteUrl(`/funds/${encodeURIComponent(fundId)}/instrument-precedence`),
        {
          method: 'DELETE',
          headers: await buildHeaders(),
        },
      )
    } catch {
      /* non-mock backend may not support yet */
    }
  },

  async getLpInstrumentPrecedenceEditor(lpId: string, fundId: string): Promise<{
    fundOrder: LegalInstrumentKind[]
    lpOverride: LegalInstrumentKind[] | null
  }> {
    if (USE_MOCKS) {
      return delay({
        fundOrder: [...getFundInstrumentOrder(fundId)],
        lpOverride: getLpInstrumentOrderOverride(lpId),
      })
    }
    return delay({
      fundOrder: [...getFundInstrumentOrder(fundId)],
      lpOverride: null,
    })
  },

  async saveLpInstrumentPrecedence(lpId: string, order: LegalInstrumentKind[]): Promise<void> {
    if (USE_MOCKS) {
      setLpInstrumentOrder(lpId, order)
      return delay(undefined)
    }
    await post(`/lps/${encodeURIComponent(lpId)}/instrument-precedence`, {
      instrument_order: order,
    })
  },

  async clearLpInstrumentPrecedence(lpId: string): Promise<void> {
    if (USE_MOCKS) {
      clearLpInstrumentOrder(lpId)
      return delay(undefined)
    }
    try {
      await apiFetch(
        apiAbsoluteUrl(`/lps/${encodeURIComponent(lpId)}/instrument-precedence`),
        {
          method: 'DELETE',
          headers: await buildHeaders(),
        },
      )
    } catch {
      /* optional backend */
    }
  },

  // --- LPs ---
  async listLPs(fundId?: string): Promise<LimitedPartner[]> {
    if (USE_MOCKS) return delay(handlers.listLPs(fundId))
    const rows = await get<unknown[]>(
      '/lps',
      fundId?.trim() ? { fund_id: fundId.trim() } : undefined,
    )
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
  async listLegalDocuments(fundId?: string): Promise<LegalDocument[]> {
    if (USE_MOCKS) return delay(handlers.listLegalDocuments(fundId))
    const rows = await get<unknown[]>(
      '/documents',
      fundId?.trim() ? { fund_id: fundId.trim() } : undefined,
    )
    return rows.map(mapDocument)
  },

  async getLegalDocument(id: string): Promise<LegalDocument | undefined> {
    if (USE_MOCKS) return delay(handlers.getLegalDocumentById(id))
    try {
      const r = await get<unknown>(`/documents/${id}`)
      return mapDocument(r)
    } catch { return undefined }
  },

  async uploadLegalDocument(
    lpId: string,
    file: File,
    opts?: { fundId?: string; instrumentKind?: LegalInstrumentKind; title?: string },
  ): Promise<LegalDocument> {
    if (USE_MOCKS) {
      return delay(
        handlers.uploadLegalDocumentForLp(lpId, file.name, {
          fundId: opts?.fundId,
          instrumentKind: opts?.instrumentKind ?? 'side_letter',
          title: opts?.title,
        }),
      )
    }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('lp_id', lpId)
    if (opts?.fundId?.trim()) fd.append('fund_id', opts.fundId.trim())
    fd.append('instrument_kind', opts?.instrumentKind ?? 'side_letter')
    if (opts?.title?.trim()) fd.append('title', opts.title.trim())

    const res = await apiFetch(apiAbsoluteUrl('/documents/upload'), {
      method: 'POST',
      headers: await buildHeaders(),
      body: fd,
    })
    if (!res.ok) throw new Error(`POST /documents/upload → ${res.status}`)
    const r = await res.json()
    return mapDocument(r)
  },

  async fetchDocumentPdfBlob(docId: string): Promise<Blob> {
    if (USE_MOCKS) {
      return new Blob(['Mock PDF — enable real API for source documents.'], { type: 'application/pdf' })
    }
    const res = await apiFetch(apiAbsoluteUrl(`/documents/${encodeURIComponent(docId)}/content`), {
      headers: await buildHeaders(),
    })
    if (!res.ok) throw new Error(`GET /documents/${docId}/content → ${res.status}`)
    return res.blob()
  },

  async getRestrictionCitation(docId: string, restrictionId: string): Promise<{
    pageNum: number | null
    contentUrl: string
    delivery: string
  } | null> {
    if (USE_MOCKS) return null
    try {
      const r = await get<{
        page_num: number | null
        content_url: string
        delivery: string
      }>(`/documents/${encodeURIComponent(docId)}/restrictions/${encodeURIComponent(restrictionId)}/citation`)
      return {
        pageNum: r.page_num,
        contentUrl: r.content_url,
        delivery: r.delivery,
      }
    } catch {
      return null
    }
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

  async listSyncJobs(integrationId?: string): Promise<SyncJob[]> {
    if (USE_MOCKS) return delay(handlers.listSyncJobs(integrationId))
    const rows = await get<unknown[]>('/integrations/sync-jobs', { integration_id: integrationId })
    return rows as SyncJob[]
  },

  async runIntegrationSyncDemo(integrationId: string): Promise<SyncJob | null> {
    if (USE_MOCKS) return delay(handlers.runIntegrationSyncDemo(integrationId))
    return null
  },

  // --- Obligations (user-created operating tasks) ---

  async listObligations(params?: {
    lpId?: string
    legalDocumentId?: string
    status?: string
  }): Promise<Obligation[]> {
    if (USE_MOCKS) return delay(handlers.listObligations())
    const rows = await get<unknown[]>('/obligations', {
      lp_id: params?.lpId,
      legal_document_id: params?.legalDocumentId,
      status: params?.status,
    })
    return rows.map(mapObligation)
  },

  async createObligation(input: CreateObligationInput): Promise<Obligation> {
    if (USE_MOCKS) return delay(handlers.createObligation(input))
    const r = await post<unknown>('/obligations', {
      title: input.title,
      kind: input.kind,
      instrument_kind: input.instrumentKind,
      lp_id: input.lpId ?? null,
      deal_id: input.dealId ?? null,
      legal_document_id: input.legalDocumentId,
      source_restriction_id: input.sourceRestrictionId ?? null,
      section_ref: input.sectionRef ?? null,
      due_at: input.dueAt ?? null,
      recurrence: input.recurrence ?? null,
      owner_role: input.ownerRole ?? 'Compliance',
      evidence_note: input.evidenceNote ?? null,
      created_by: input.createdBy ?? null,
    })
    return mapObligation(r)
  },

  async completeObligation(id: string, actor: string): Promise<Obligation | null> {
    if (USE_MOCKS) return delay(handlers.completeObligation(id, actor) ?? null)
    try {
      const r = await post<unknown>(`/obligations/${encodeURIComponent(id)}/complete`)
      return mapObligation(r)
    } catch {
      return null
    }
  },

  allocationsForLp(lpId: string): Promise<Allocation[]> {
    return api.allocationsForLpReal(lpId)
  },

  addAllocation(lpId: string, dealName: string, sector: string, amountUsd: number, closedAt: string): Promise<Allocation> {
    return api.addAllocationReal(lpId, dealName, sector, amountUsd, closedAt)
  },

  updateAllocation(
    allocationId: string,
    patch: { dealName?: string; sector?: string; amountUsd?: number; closedAt?: string },
  ): Promise<Allocation | null> {
    return api.updateAllocationReal(allocationId, patch)
  },

  removeAllocation(allocationId: string): Promise<boolean> {
    return api.removeAllocationReal(allocationId)
  },

  async sectorBreakdownForLp(lpId: string): Promise<Array<{ sector: string; amountUsd: number; pct: number }>> {
    if (USE_MOCKS) return delay(handlers.sectorBreakdownForLp(lpId))
    try {
      const [lpRaw, rows] = await Promise.all([
        get<unknown>(`/lps/${encodeURIComponent(lpId)}`),
        get<unknown[]>('/allocations', { lp_id: lpId }),
      ])
      const lp = mapLp(lpRaw)
      return computeSectorBreakdown(lp, rows.map(mapAllocation))
    } catch {
      return []
    }
  },

  listSectorConcentrationRules(lpId?: string): Promise<SectorConcentrationRule[]> {
    if (USE_MOCKS) return delay(handlers.listSectorConcentrationRules(lpId))
    return Promise.resolve([])
  },

  updateLpCommitment(lpId: string, commitmentUsd: number, fundedUsd: number): Promise<LimitedPartner | null> {
    if (USE_MOCKS) return delay(handlers.updateLpCommitment(lpId, commitmentUsd, fundedUsd) ?? null)
    return api.updateLP(lpId, { commitmentUsd, fundedUsd })
  },

  async capacitySnapshot(lpId: string): Promise<CapacitySnapshot | null> {
    if (USE_MOCKS) {
      const lp = handlers.getLpById(lpId)
      return delay(lp ? handlers.capacitySnapshotForLp(lp) : null)
    }
    try {
      const [lpRaw, rows] = await Promise.all([
        get<unknown>(`/lps/${encodeURIComponent(lpId)}`),
        get<unknown[]>('/allocations', { lp_id: lpId }),
      ])
      const lp = mapLp(lpRaw)
      const allocations = rows.map(mapAllocation)
      const rule = handlers.capacityRuleForLp(lpId)
      const pct = rule?.maxSingleInvestmentPct ?? DEFAULT_SINGLE_DEAL_CAP_PCT
      return computeCapacitySnapshot(lp, allocations, pct)
    } catch {
      return null
    }
  },

  async screeningContextForFund(fundId: string): Promise<ScreeningContext> {
    const [lps, restrictionRows, docs] = await Promise.all([
      api.listLPs(fundId),
      get<unknown[]>('/restrictions'),
      api.listLegalDocuments(fundId),
    ])
    const lpIds = new Set(lps.map((lp) => lp.id))
    const mappedRestrictions = restrictionRows
      .map(mapRestriction)
      .filter((r) => r.lpId === null || lpIds.has(r.lpId))

    const allocationsByLp: Record<string, Allocation[]> = {}
    try {
      const allocRows = await get<unknown[]>('/allocations', { fund_id: fundId })
      for (const a of allocRows.map(mapAllocation)) {
        if (!allocationsByLp[a.lpId]) allocationsByLp[a.lpId] = []
        allocationsByLp[a.lpId].push(a)
      }
    } catch {
      const perLp = await Promise.all(lps.map((lp) => api.allocationsForLpReal(lp.id)))
      lps.forEach((lp, i) => {
        allocationsByLp[lp.id] = perLp[i] ?? []
      })
    }

    const sectorRules = USE_MOCKS
      ? (await handlers.listSectorConcentrationRules()).filter((r) => lpIds.has(r.lpId))
      : []

    return {
      lps,
      restrictions: mappedRestrictions,
      allocationsByLp,
      sectorConcentrationRules: sectorRules,
      legalDocuments: docs,
      getInstrumentOrder: getEffectiveInstrumentOrder,
    }
  },

  async screeningRunForDeal(deal: Deal, runBy: string): Promise<ScreeningRun> {
    if (USE_MOCKS) return delay(handlers.createScreeningRun(deal, runBy))
    const ctx = await api.screeningContextForFund(deal.fundId)
    return createScreeningRunFromDeal(deal, ctx, runBy, 'rules-api-2026.05')
  },

  async runScreening(dealId: string, runBy: string): Promise<ScreeningRun | null> {
    if (USE_MOCKS) {
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
    }
    const deal = await api.getDeal(dealId)
    if (!deal) return null
    return api.screeningRunForDeal(deal, runBy)
  },

  async evaluateScreeningOnly(dealId: string): Promise<ScreeningRun | null> {
    if (USE_MOCKS) {
      const deal = handlers.getDealById(dealId)
      if (!deal) return delay(null)
      return delay(handlers.createScreeningRun(deal, 'Preview'))
    }
    const deal = await api.getDeal(dealId)
    if (!deal) return null
    return api.screeningRunForDeal(deal, 'Preview')
  },

  async listAuditEvents(params?: { entityRef?: string; type?: string; limit?: number }): Promise<AuditEvent[]> {
    if (USE_MOCKS) return delay(handlers.listAuditEvents())
    const rows = await get<unknown[]>('/audit-events', {
      entity_ref: params?.entityRef,
      type: params?.type,
      limit: params?.limit != null ? String(params.limit) : undefined,
    })
    return rows.map(mapAuditEvent)
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
