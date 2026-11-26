import { CopyDraft, CopyOutput } from '@ai-post-recipe/shared'

import { findUnsupportedFacts } from './grounding.js'
import { LANGUAGE_NAMES, type Phase, runPrompt } from './phase.js'

/**
 * Writes caption, hashtags and slide text for the three planned posts, then
 * checks every number and quote against the material of the run.
 */
export const copyPhase: Phase<'COPY'> = {
  key: 'COPY',
  outputSchema: CopyOutput,
  execute: async (ctx) => {
    const { brief, outputs } = ctx
    const result = await runPrompt(ctx, 'copy', CopyDraft, {
      language: LANGUAGE_NAMES[brief.language],
      brief,
      analysis: outputs.ANALYSIS,
      plan: outputs.PLAN,
    })

    const corpus = [
      JSON.stringify(brief),
      ...(outputs.RESEARCH?.sources ?? []).map((s) => `${s.title}\n${s.text}`),
      ...(outputs.ANALYSIS?.claims ?? []).flatMap((c) => [
        c.text,
        c.evidence ?? '',
      ]),
    ]
    const unsupported = findUnsupportedFacts(result.output.posts, corpus)
    return { ...result, output: { ...result.output, unsupported } }
  },
}
