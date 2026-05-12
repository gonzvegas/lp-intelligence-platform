import type {
  Allocation,
  AuditEvent,
  CapacityRule,
  Deal,
  ExtractedRestriction,
  IntegrationStatus,
  LimitedPartner,
  ReportJob,
  Role,
  SideLetterDocument,
  SignOff,
  UserAccount,
} from '../domain/types'

export const funds = [
  { id: 'fund-1', name: 'Comvest Credit Partners IV', vintage: '2024' },
  { id: 'fund-2', name: 'Comvest Equity Opportunities II', vintage: '2023' },
]

export const limitedPartners: LimitedPartner[] = [
  {
    id: 'lp-1',
    name: 'State Pension Trust Alpha',
    investorType: 'Public pension',
    commitmentUsd: 75_000_000,
    fundedUsd: 42_000_000,
  },
  {
    id: 'lp-2',
    name: 'University Endowment Beta',
    investorType: 'Endowment',
    commitmentUsd: 40_000_000,
    fundedUsd: 18_500_000,
  },
  {
    id: 'lp-3',
    name: 'Insurance Pool Gamma',
    investorType: 'Insurance',
    commitmentUsd: 60_000_000,
    fundedUsd: 33_000_000,
  },
  {
    id: 'lp-4',
    name: 'Family Office Delta',
    investorType: 'Family office',
    commitmentUsd: 25_000_000,
    fundedUsd: 9_000_000,
  },
]

export const sideLetters: SideLetterDocument[] = [
  {
    id: 'sl-1',
    lpId: 'lp-1',
    title: 'Side Letter — Alpha (Executed)',
    uploadedAt: '2024-03-12T14:22:00Z',
    reviewStatus: 'confirmed',
    restrictionIds: ['r-1', 'r-2'],
  },
  {
    id: 'sl-2',
    lpId: 'lp-2',
    title: 'Side Letter — Beta (Executed)',
    uploadedAt: '2024-05-01T09:05:00Z',
    reviewStatus: 'extracted',
    restrictionIds: ['r-3', 'r-4'],
  },
  {
    id: 'sl-3',
    lpId: 'lp-3',
    title: 'Side Letter — Gamma (Executed)',
    uploadedAt: '2024-06-18T16:40:00Z',
    reviewStatus: 'confirmed',
    restrictionIds: ['r-5'],
  },
  {
    id: 'sl-4',
    lpId: 'lp-4',
    title: 'Side Letter — Delta (Draft upload)',
    uploadedAt: '2026-05-02T11:10:00Z',
    reviewStatus: 'processing',
    restrictionIds: [],
  },
]

export const restrictions: ExtractedRestriction[] = [
  {
    id: 'r-1',
    lpId: 'lp-1',
    sideLetterId: 'sl-1',
    category: 'sector',
    severity: 'hard',
    summary:
      'No direct investments in fossil fuel extraction or midstream assets.',
    rawQuote: 'Section 4.2 — Fossil Fuels',
    effectiveFrom: '2024-03-12',
    reviewStatus: 'confirmed',
  },
  {
    id: 'r-2',
    lpId: 'lp-1',
    sideLetterId: 'sl-1',
    category: 'geography',
    severity: 'hard',
    summary: 'No investments with material operations in sanctioned jurisdictions.',
    effectiveFrom: '2024-03-12',
    reviewStatus: 'confirmed',
  },
  {
    id: 'r-3',
    lpId: 'lp-2',
    sideLetterId: 'sl-2',
    category: 'sector',
    severity: 'soft',
    summary: 'Gambling and gaming businesses require IC memo and LP consent.',
    effectiveFrom: '2024-05-01',
    reviewStatus: 'draft',
  },
  {
    id: 'r-4',
    lpId: 'lp-2',
    sideLetterId: 'sl-2',
    category: 'esg',
    severity: 'hard',
    summary: 'Prohibited: thermal coal extraction exposure above de minimis thresholds.',
    effectiveFrom: '2024-05-01',
    reviewStatus: 'confirmed',
  },
  {
    id: 'r-5',
    lpId: 'lp-3',
    sideLetterId: 'sl-3',
    category: 'geography',
    severity: 'hard',
    summary: 'No investments headquartered or principally operated in Country X.',
    effectiveFrom: '2024-06-18',
    reviewStatus: 'confirmed',
  },
]

export const deals: Deal[] = [
  {
    id: 'deal-1',
    name: 'Midstream Logistics Credit Facility',
    sector: 'Energy — Midstream',
    geography: 'United States',
    esgFlags: [],
    proposedAmountUsd: 18_000_000,
    pipelineStage: 'IC pending',
  },
  {
    id: 'deal-2',
    name: 'Regional Casino Operator Term Loan',
    sector: 'Consumer — Gaming',
    geography: 'United States',
    esgFlags: [],
    proposedAmountUsd: 12_000_000,
    pipelineStage: 'Due diligence',
  },
  {
    id: 'deal-3',
    name: 'Export-Oriented Holdings Co.',
    sector: 'Industrials',
    geography: 'Country X',
    esgFlags: [],
    proposedAmountUsd: 22_000_000,
    pipelineStage: 'Term sheet',
  },
  {
    id: 'deal-4',
    name: 'Power Generation Asset Refi',
    sector: 'Energy — Power',
    geography: 'Canada',
    esgFlags: ['coal_exposure'],
    proposedAmountUsd: 30_000_000,
    pipelineStage: 'IC pending',
  },
]

export const capacityRules: CapacityRule[] = limitedPartners.map((lp, i) => ({
  id: `cr-${lp.id}`,
  lpId: lp.id,
  maxSingleInvestmentPct: [12, 15, 10, 20][i] ?? 15,
  description: 'Per-deal concentration limit per executed side letter.',
}))

export const allocations: Allocation[] = [
  {
    id: 'a-1',
    lpId: 'lp-1',
    dealId: 'past-1',
    dealName: 'Sponsor-backed SaaS revolver',
    amountUsd: 8_000_000,
    closedAt: '2025-01-15',
  },
  {
    id: 'a-2',
    lpId: 'lp-1',
    dealId: 'past-2',
    dealName: 'Healthcare rollup TL-C',
    amountUsd: 11_000_000,
    closedAt: '2025-08-22',
  },
  {
    id: 'a-3',
    lpId: 'lp-2',
    dealId: 'past-3',
    dealName: 'Industrial packaging acquisition',
    amountUsd: 6_500_000,
    closedAt: '2025-03-10',
  },
]

export const auditEvents: AuditEvent[] = [
  {
    id: 'ae-1',
    at: '2026-05-12T09:14:00Z',
    actor: 'Jordan Lee',
    persona: 'compliance',
    type: 'restriction_confirmed',
    summary: 'Confirmed restriction r-4 (thermal coal) for LP Beta.',
    entityRef: 'r-4',
  },
  {
    id: 'ae-2',
    at: '2026-05-11T16:02:00Z',
    actor: 'Sam Rivera',
    persona: 'gp',
    type: 'screening_run',
    summary:
      'Screening run sr-101 for Power Generation Asset Refi — inputs hash logged.',
    entityRef: 'sr-101',
  },
  {
    id: 'ae-3',
    at: '2026-05-10T13:40:00Z',
    actor: 'Morgan Patel',
    persona: 'legal',
    type: 'sign_off',
    summary: 'Compliance sign-off recorded for Regional Casino Operator.',
    entityRef: 'so-2',
  },
  {
    id: 'ae-4',
    at: '2026-05-09T10:05:00Z',
    actor: 'Taylor Chen',
    persona: 'admin',
    type: 'document_upload',
    summary: 'Side letter PDF uploaded for LP Delta (processing).',
    entityRef: 'sl-4',
  },
  {
    id: 'ae-5',
    at: '2026-05-08T07:55:00Z',
    actor: 'Integration — DealCloud',
    persona: 'admin',
    type: 'integration_sync',
    summary: 'Deal pipeline delta sync completed (42 records).',
    entityRef: 'dealcloud',
  },
]

export const signOffs: SignOff[] = [
  {
    id: 'so-1',
    dealId: 'deal-4',
    dealName: 'Power Generation Asset Refi',
    requestedAt: '2026-05-11T15:00:00Z',
    status: 'pending',
    assigneeRole: 'Chief Compliance Officer',
    screeningRunId: 'sr-101',
  },
  {
    id: 'so-2',
    dealId: 'deal-2',
    dealName: 'Regional Casino Operator Term Loan',
    requestedAt: '2026-05-09T12:00:00Z',
    status: 'approved',
    assigneeRole: 'Chief Compliance Officer',
    screeningRunId: 'sr-98',
  },
]

export const reportJobs: ReportJob[] = [
  {
    id: 'rep-1',
    name: 'LP restriction attestation — Q1 2026',
    requestedAt: '2026-05-12T08:00:00Z',
    status: 'ready',
  },
  {
    id: 'rep-2',
    name: 'Capacity utilization by vintage',
    requestedAt: '2026-05-11T19:30:00Z',
    status: 'queued',
  },
]

export const integrations: IntegrationStatus[] = [
  { id: 'int-dc', name: 'DealCloud', connected: true, lastSyncAt: '2026-05-12T07:55:00Z' },
  { id: 'int-sf', name: 'Salesforce', connected: false },
  { id: 'int-csv', name: 'Manual CSV import', connected: true, lastSyncAt: '2026-05-01T12:00:00Z' },
]

export const roles: Role[] = [
  {
    id: 'role-gp',
    name: 'Fund Manager / GP',
    permissions: ['deals:read', 'screening:run', 'capacity:read'],
  },
  {
    id: 'role-compliance',
    name: 'Compliance Officer',
    permissions: ['restrictions:*', 'signoffs:*', 'audit:read'],
  },
  {
    id: 'role-ir',
    name: 'IR',
    permissions: ['lps:*', 'reports:read'],
  },
  {
    id: 'role-legal',
    name: 'Legal / CCO',
    permissions: ['audit:*', 'reports:*'],
  },
  {
    id: 'role-admin',
    name: 'System Administrator',
    permissions: ['*'],
  },
]

export const users: UserAccount[] = [
  { id: 'u-1', name: 'Sam Rivera', email: 'sam.rivera@example.com', roleId: 'role-gp' },
  { id: 'u-2', name: 'Jordan Lee', email: 'jordan.lee@example.com', roleId: 'role-compliance' },
  { id: 'u-3', name: 'Alex Kim', email: 'alex.kim@example.com', roleId: 'role-ir' },
  { id: 'u-4', name: 'Morgan Patel', email: 'morgan.patel@example.com', roleId: 'role-legal' },
  { id: 'u-5', name: 'Taylor Chen', email: 'taylor.chen@example.com', roleId: 'role-admin' },
]
