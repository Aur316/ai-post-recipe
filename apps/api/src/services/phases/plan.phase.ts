import { PlanOutput } from '@ai-post-recipe/shared'

import { LANGUAGE_NAMES, type Phase, runPrompt } from './phase.js'

export const planPhase: Phase<'PLAN'> = {
  key: 'PLAN',
  outputSchema: PlanOutput,
  execute: (ctx) =>
    runPrompt(ctx, 'plan', PlanOutput, {
      language: LANGUAGE_NAMES[ctx.brief.language],
      brief: ctx.brief,
      analysis: ctx.outputs.ANALYSIS,
    }),
}
