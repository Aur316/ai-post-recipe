import type { PhaseStatus, RunStatus } from '@ai-post-recipe/shared'

/** Badge variants that carry the meaning of a status. */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

export const RUN_STATUS_TONES: Record<RunStatus, StatusTone> = {
  DRAFT: 'neutral',
  RUNNING: 'info',
  AWAITING_APPROVAL: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
}

/** `undefined` is a phase that has not started yet. */
export const phaseStatusTone = (status?: PhaseStatus): StatusTone => {
  switch (status) {
    case 'PENDING':
    case 'RUNNING':
      return 'info'
    case 'AWAITING_APPROVAL':
      return 'warning'
    case 'APPROVED':
    case 'DONE':
      return 'success'
    case 'FAILED':
      return 'danger'
    default:
      return 'neutral'
  }
}
