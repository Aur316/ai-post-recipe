import { VisualsOutput } from '@ai-post-recipe/shared'

import type { Phase } from './phase.js'

/** Placeholder until M7: one slide entry per copy slide, no images yet. */
export const visualsPhase: Phase<'VISUALS'> = {
  key: 'VISUALS',
  outputSchema: VisualsOutput,
  execute: ({ outputs }) =>
    Promise.resolve({
      output: {
        slides: (outputs.COPY?.posts ?? []).flatMap((post) =>
          post.slides.map((slide) => ({
            postIndex: post.index,
            order: slide.order,
          })),
        ),
      },
    }),
}
