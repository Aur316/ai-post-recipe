import {
  PHASE_ORDER,
  type PhaseKey,
  type PhaseStatus,
  type RunStatus,
} from '@ai-post-recipe/shared'

const FINISHED: ReadonlyArray<PhaseStatus> = ['DONE', 'APPROVED']

/** The run status follows from the latest attempt of each phase. */
export function deriveRunStatus(
  latest: Array<{ phase: PhaseKey; status: PhaseStatus }>,
): RunStatus {
  const statuses = latest.map((p) => p.status)
  if (statuses.some((s) => s === 'PENDING' || s === 'RUNNING')) return 'RUNNING'
  if (statuses.includes('AWAITING_APPROVAL')) return 'AWAITING_APPROVAL'
  if (statuses.includes('FAILED')) return 'FAILED'
  const finished = PHASE_ORDER.every((phase) =>
    latest.some((p) => p.phase === phase && FINISHED.includes(p.status)),
  )
  if (finished) return 'COMPLETED'
  // Not started yet, or paused with stale phases: Start continues it.
  return 'DRAFT'
}

/** The first phase that still has to run, if any. */
export function nextPhaseToRun(
  latest: Array<{ phase: PhaseKey; status: PhaseStatus }>,
): PhaseKey | undefined {
  return PHASE_ORDER.find((phase) => {
    const status = latest.find((p) => p.phase === phase)?.status
    return !status || status === 'FAILED' || status === 'STALE'
  })
}
