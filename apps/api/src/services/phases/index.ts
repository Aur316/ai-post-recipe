import type { PhaseKey } from '@ai-post-recipe/shared'

import { analysisPhase } from './analysis.phase.js'
import { briefPhase } from './brief.phase.js'
import { copyPhase } from './copy.phase.js'
import { exportPhase } from './export.phase.js'
import type { Phase } from './phase.js'
import { planPhase } from './plan.phase.js'
import { researchPhase } from './research.phase.js'
import { reviewPhase } from './review.phase.js'
import { visualsPhase } from './visuals.phase.js'

export type PhaseRegistry = { [K in PhaseKey]: Phase<K> }

export const phases: PhaseRegistry = {
  BRIEF: briefPhase,
  RESEARCH: researchPhase,
  ANALYSIS: analysisPhase,
  PLAN: planPhase,
  COPY: copyPhase,
  VISUALS: visualsPhase,
  REVIEW: reviewPhase,
  EXPORT: exportPhase,
}
