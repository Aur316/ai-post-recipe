import { BriefOutput } from '@ai-post-recipe/shared'

import type { Phase } from './phase.js'

export const briefPhase: Phase<'BRIEF'> = {
  key: 'BRIEF',
  outputSchema: BriefOutput,
  execute: () => Promise.resolve({ output: { accepted: true } }),
}
