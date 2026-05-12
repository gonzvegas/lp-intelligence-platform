import type {
  Allocation,
  AuditEvent,
  CapacitySnapshot,
  Deal,
  ExtractedRestriction,
  IntegrationStatus,
  LimitedPartner,
  ReportJob,
  Role,
  ScreeningRun,
  SideLetterDocument,
  SignOff,
  UserAccount,
} from '../domain/types'
import * as handlers from '../mocks/handlers'

const delayMs = 280

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delayMs))
}

export const api = {
  listDeals(): Promise<Deal[]> {
    return delay(handlers.listDeals())
  },
  getDeal(id: string): Promise<Deal | undefined> {
    return delay(handlers.getDealById(id))
  },

  listLPs(): Promise<LimitedPartner[]> {
    return delay(handlers.listLPs())
  },
  getLp(id: string): Promise<LimitedPartner | undefined> {
    return delay(handlers.getLpById(id))
  },

  listSideLetters(): Promise<SideLetterDocument[]> {
    return delay(handlers.listSideLetters())
  },
  getSideLetter(id: string): Promise<SideLetterDocument | undefined> {
    return delay(handlers.getSideLetterById(id))
  },

  listRestrictions(): Promise<ExtractedRestriction[]> {
    return delay(handlers.listRestrictions())
  },
  restrictionsForLp(lpId: string): Promise<ExtractedRestriction[]> {
    return delay(handlers.restrictionsForLp(lpId))
  },

  allocationsForLp(lpId: string): Promise<Allocation[]> {
    return delay(handlers.allocationsForLp(lpId))
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

  updateSignOff(
    id: string,
    status: SignOff['status'],
    actor: string,
  ): Promise<SignOff | null> {
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

  listIntegrations(): Promise<IntegrationStatus[]> {
    return delay(handlers.listIntegrations())
  },

  toggleIntegration(id: string): Promise<IntegrationStatus | null> {
    return delay(handlers.toggleIntegration(id) ?? null)
  },

  listUsers(): Promise<UserAccount[]> {
    return delay(handlers.listUsers())
  },

  listRoles(): Promise<Role[]> {
    return delay(handlers.listRoles())
  },

  confirmRestriction(
    restrictionId: string,
    actor: string,
  ): Promise<ExtractedRestriction | null> {
    const r = handlers.listRestrictions().find((x) => x.id === restrictionId)
    if (!r) return delay(null)
    r.reviewStatus = 'confirmed'
    handlers.appendAuditEvent({
      at: new Date().toISOString(),
      actor,
      persona: 'compliance',
      type: 'restriction_confirmed',
      summary: `Restriction ${restrictionId} confirmed after human review.`,
      entityRef: restrictionId,
    })
    return delay(r)
  },
}
