import { PHASE_OUTPUT_SCHEMAS, type PhaseKey } from '@ai-post-recipe/shared'

export function formatPhaseOutput(phase: PhaseKey, value: unknown) {
  const parsed = PHASE_OUTPUT_SCHEMAS[phase].safeParse(value)
  return JSON.stringify(parsed.success ? parsed.data : value, null, 2)
}
