import type { DocumentPipelineStage, LegalDocument } from './types'

export type { DocumentPipelineStage }

const PIPELINE_ORDER: DocumentPipelineStage[] = [
  'uploaded',
  'parsing',
  'extracted',
  'legal_review',
  'active',
]

/** Resolve stage for UI when optional `pipelineStage` omitted (legacy fixtures). */
export function resolvePipelineStage(doc: LegalDocument): DocumentPipelineStage {
  if (doc.pipelineStage) return doc.pipelineStage
  if (doc.reviewStatus === 'confirmed') return 'active'
  if (doc.reviewStatus === 'extracted') return 'extracted'
  return 'parsing'
}

export function pipelineStepIndex(stage: DocumentPipelineStage): number {
  if (stage === 'archived') return -1
  const i = PIPELINE_ORDER.indexOf(stage)
  return i === -1 ? 0 : i
}

export function pipelineStageLabel(stage: DocumentPipelineStage): string {
  switch (stage) {
    case 'uploaded':
      return 'Uploaded'
    case 'parsing':
      return 'Parsing / OCR'
    case 'extracted':
      return 'Extracted'
    case 'legal_review':
      return 'Legal review'
    case 'active':
      return 'Active (governing)'
    case 'archived':
      return 'Archived (superseded)'
    default:
      return stage
  }
}

export function ingestionSourceLabel(source: LegalDocument['ingestionSource']): string {
  switch (source) {
    case 'dealcloud':
      return 'DealCloud sync'
    case 'csv_import':
      return 'CSV / bulk import'
    case 'manual':
      return 'Manual upload'
    default:
      return 'Manual upload'
  }
}

export const PIPELINE_STEPS_EXCLUDING_ARCHIVED = PIPELINE_ORDER
