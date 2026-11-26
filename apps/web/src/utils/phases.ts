import type { PhaseRunDto, PhaseStatus } from '@ai-post-recipe/shared'

export const isPhaseActive = (status?: PhaseStatus) =>
  status === 'PENDING' || status === 'RUNNING'

export const formatDuration = (phase: PhaseRunDto) => {
  if (!phase.startedAt || !phase.finishedAt) return undefined
  const ms = Date.parse(phase.finishedAt) - Date.parse(phase.startedAt)
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}
