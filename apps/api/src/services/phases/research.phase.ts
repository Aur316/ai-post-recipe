import { ResearchOutput } from '@ai-post-recipe/shared'

import type { Phase } from './phase.js'

/** Placeholder until M5: lists the brief's links as sources without fetching them. */
export const researchPhase: Phase<'RESEARCH'> = {
  key: 'RESEARCH',
  outputSchema: ResearchOutput,
  execute: ({ brief }) =>
    Promise.resolve({
      output: {
        sources: brief.links.map((link) => ({
          url: link.url,
          title: link.url,
          excerpt: '',
          reachable: true,
        })),
      },
    }),
}
