import type { PhaseKey, PhaseRunDto, PhaseStatus } from '@ai-post-recipe/shared'

export const PHASE_LABELS: Record<PhaseKey, string> = {
  BRIEF: 'Brief',
  RESEARCH: 'Research',
  ANALYSIS: 'Brand analysis',
  PLAN: 'Content plan',
  COPY: 'Copy',
  VISUALS: 'Visuals',
  REVIEW: 'Review',
  EXPORT: 'Export',
}

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  PENDING: 'Queued',
  RUNNING: 'Running',
  AWAITING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  DONE: 'Done',
  FAILED: 'Failed',
  STALE: 'Stale',
}

export const isPhaseActive = (status?: PhaseStatus) =>
  status === 'PENDING' || status === 'RUNNING'

export const formatDuration = (phase: PhaseRunDto) => {
  if (!phase.startedAt || !phase.finishedAt) return undefined
  const ms = Date.parse(phase.finishedAt) - Date.parse(phase.startedAt)
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}
