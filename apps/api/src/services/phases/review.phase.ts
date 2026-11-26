import { ReviewOutput } from '@ai-post-recipe/shared'

import type { Phase } from './phase.js'

/** Placeholder until M8. */
export const reviewPhase: Phase<'REVIEW'> = {
  key: 'REVIEW',
  outputSchema: ReviewOutput,
  execute: () => Promise.resolve({ output: { score: 1, issues: [] } }),
}
