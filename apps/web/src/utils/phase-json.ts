import { PHASE_OUTPUT_SCHEMAS, type PhaseKey } from '@ai-post-recipe/shared'

/**
 * A phase output as indented JSON with its keys in schema order. The database
 * (jsonb) stores keys in its own order, which is hard to read and edit.
 */
export function formatPhaseOutput(phase: PhaseKey, value: unknown) {
  const parsed = PHASE_OUTPUT_SCHEMAS[phase].safeParse(value)
  return JSON.stringify(parsed.success ? parsed.data : value, null, 2)
}
