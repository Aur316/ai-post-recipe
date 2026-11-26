import { CopyOutput } from '@ai-post-recipe/shared'

import { LANGUAGE_NAMES, type Phase, runPrompt } from './phase.js'

export const copyPhase: Phase<'COPY'> = {
  key: 'COPY',
  outputSchema: CopyOutput,
  execute: (ctx) =>
    runPrompt(ctx, 'copy', CopyOutput, {
      language: LANGUAGE_NAMES[ctx.brief.language],
      brief: ctx.brief,
      analysis: ctx.outputs.ANALYSIS,
      plan: ctx.outputs.PLAN,
    }),
}
