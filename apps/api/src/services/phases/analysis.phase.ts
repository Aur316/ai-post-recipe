import { AnalysisOutput } from '@ai-post-recipe/shared'

import { LANGUAGE_NAMES, type Phase, runPrompt } from './phase.js'
import { normalizeUrl } from './research.phase.js'

/**
 * A vision model reads the screenshots, product photos and logo together with
 * the fetched pages. A verified claim must cite a page that was actually read;
 * anything else becomes an assumption.
 */
export const analysisPhase: Phase<'ANALYSIS'> = {
  key: 'ANALYSIS',
  outputSchema: AnalysisOutput,
  execute: async (ctx) => {
    const sources = ctx.outputs.RESEARCH?.sources ?? []
    const images = await ctx.loadImages()

    const result = await runPrompt(
      ctx,
      'analysis',
      AnalysisOutput,
      {
        language: LANGUAGE_NAMES[ctx.brief.language],
        brief: ctx.brief,
        sources: sources.map((s) =>
          s.reachable
            ? { url: s.url, title: s.title, text: s.text }
            : { url: s.url, unreachable: s.error },
        ),
        images: images.length
          ? images.map((i) => i.label).join('\n')
          : 'No images were uploaded.',
      },
      images,
    )

    const readable = new Set(
      sources.filter((s) => s.reachable).map((s) => normalizeUrl(s.url)),
    )
    const claims = result.output.claims.map((claim) =>
      claim.status === 'verified' &&
      (!claim.sourceUrl || !readable.has(normalizeUrl(claim.sourceUrl)))
        ? {
            ...claim,
            status: 'assumption' as const,
            sourceUrl: null,
            evidence: null,
          }
        : claim,
    )
    return { ...result, output: { ...result.output, claims } }
  },
}
