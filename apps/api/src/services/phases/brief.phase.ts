import { BriefOutput } from '@ai-post-recipe/shared'

import type { Phase } from './phase.js'

/** The brief is validated when the run is created; this phase records that it was accepted. */
export const briefPhase: Phase<'BRIEF'> = {
  key: 'BRIEF',
  outputSchema: BriefOutput,
  execute: () => Promise.resolve({ output: { accepted: true } }),
}
