import { PlanOutput } from '@ai-post-recipe/shared'

import { type Phase, runPrompt } from './phase.js'

export const planPhase: Phase<'PLAN'> = {
  key: 'PLAN',
  outputSchema: PlanOutput,
  execute: (ctx) =>
    runPrompt(ctx, 'plan@v0', PlanOutput, {
      brief: ctx.brief,
      analysis: ctx.outputs.ANALYSIS,
    }),
}
