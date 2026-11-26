import { CopyOutput } from '@ai-post-recipe/shared'

import { type Phase, runPrompt } from './phase.js'

export const copyPhase: Phase<'COPY'> = {
  key: 'COPY',
  outputSchema: CopyOutput,
  execute: (ctx) =>
    runPrompt(ctx, 'copy@v0', CopyOutput, {
      brief: ctx.brief,
      plan: ctx.outputs.PLAN,
      sources: ctx.outputs.RESEARCH?.sources ?? [],
    }),
}
