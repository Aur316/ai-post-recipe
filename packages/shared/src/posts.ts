import { z } from 'zod'

import { PostFormat } from './phases.js'

/** A post of the run: the plan when it is approved, the copy once it is written. */
export const PostDto = z.object({
  id: z.uuid(),
  index: z.number().int(),
  format: PostFormat,
  goal: z.string(),
  concept: z.string(),
  rationale: z.string(),
  product: z.string(),
  caption: z.string().nullable(),
  hashtags: z.array(z.string()),
  slides: z.array(z.object({ order: z.number().int(), text: z.string() })),
})
export type PostDto = z.infer<typeof PostDto>
