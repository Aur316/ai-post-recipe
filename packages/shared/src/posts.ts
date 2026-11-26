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
  slides: z.array(
    z.object({
      order: z.number().int(),
      text: z.string(),
      /** The rendered PNG, once the visuals phase has run. */
      assetId: z.string().nullable(),
    }),
  ),
})
export type PostDto = z.infer<typeof PostDto>

/** Edits a person makes to a post's text after it was written. */
export const UpdatePostBody = z.object({
  caption: z.string().trim().min(1).max(2200),
  hashtags: z
    .array(
      z
        .string()
        .trim()
        .regex(/^#\S+$/, 'A hashtag starts with #'),
    )
    .max(30),
})
export type UpdatePostBody = z.infer<typeof UpdatePostBody>

export const RegenerateSlideBody = z.object({
  /** e.g. "darker background", "more space for the text". */
  instruction: z.string().trim().max(300).optional(),
})
export type RegenerateSlideBody = z.infer<typeof RegenerateSlideBody>

export const SlideParams = z.object({
  id: z.uuid(),
  index: z.coerce.number().int().min(1).max(3),
  order: z.coerce.number().int().min(1),
})
export const PostParams = SlideParams.omit({ order: true })
