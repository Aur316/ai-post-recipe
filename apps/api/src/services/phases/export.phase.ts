import { ExportOutput } from '@ai-post-recipe/shared'

import type { Phase } from './phase.js'

/** Placeholder until M8 builds the ZIP. */
export const exportPhase: Phase<'EXPORT'> = {
  key: 'EXPORT',
  outputSchema: ExportOutput,
  execute: () => Promise.resolve({ output: {} }),
}
