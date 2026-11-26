import { AnalysisOutput } from '@ai-post-recipe/shared'

import { type Phase, runPrompt } from './phase.js'

export const analysisPhase: Phase<'ANALYSIS'> = {
  key: 'ANALYSIS',
  outputSchema: AnalysisOutput,
  execute: (ctx) =>
    runPrompt(ctx, 'analysis@v0', AnalysisOutput, {
      brief: ctx.brief,
      sources: ctx.outputs.RESEARCH?.sources ?? [],
    }),
}
