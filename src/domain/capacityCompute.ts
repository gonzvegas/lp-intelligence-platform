import type { Allocation, CapacitySnapshot, LimitedPartner } from './types'

export const DEFAULT_SINGLE_DEAL_CAP_PCT = 15

/** Sum of holdings (deployed exposure) for an LP. */
export function totalDeployedUsd(allocations: Allocation[]): number {
  return allocations.reduce((s, a) => s + a.amountUsd, 0)
}

export function computeCapacitySnapshot(
  lp: LimitedPartner,
  allocations: Allocation[],
  concentrationLimitPct = DEFAULT_SINGLE_DEAL_CAP_PCT,
): CapacitySnapshot {
  const deployedUsd = totalDeployedUsd(allocations)
  const remainingCommitmentUsd = Math.max(0, lp.commitmentUsd - deployedUsd)
  const maxFromPct = (lp.commitmentUsd * concentrationLimitPct) / 100
  const maxNewDealUsd = Math.max(0, Math.round(Math.min(maxFromPct, remainingCommitmentUsd)))

  return {
    lpId: lp.id,
    commitmentUsd: lp.commitmentUsd,
    deployedUsd,
    remainingCommitmentUsd,
    concentrationLimitPct,
    maxNewDealUsd,
  }
}

export function computeSectorBreakdown(
  lp: LimitedPartner,
  allocations: Allocation[],
): Array<{ sector: string; amountUsd: number; pct: number }> {
  if (lp.commitmentUsd <= 0) return []
  const map: Record<string, number> = {}
  for (const a of allocations) {
    const sector = a.sector?.trim() ? a.sector.trim() : 'Uncategorized'
    map[sector] = (map[sector] ?? 0) + a.amountUsd
  }
  return Object.entries(map)
    .map(([sector, amountUsd]) => ({
      sector,
      amountUsd,
      pct: Math.round((amountUsd / lp.commitmentUsd) * 1000) / 10,
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd)
}
