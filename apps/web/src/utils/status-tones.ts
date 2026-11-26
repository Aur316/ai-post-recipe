import type { PhaseStatus, RunStatus } from '@ai-post-recipe/shared'

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

export const RUN_STATUS_TONES: Record<RunStatus, StatusTone> = {
  DRAFT: 'neutral',
  RUNNING: 'info',
  AWAITING_APPROVAL: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
}

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
