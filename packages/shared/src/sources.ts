import { z } from 'zod'

import { SourceOrigin } from './phases.js'

/** A source the research phase read (or tried to), as the API returns it. */
export const SourceDto = z.object({
  id: z.uuid(),
  url: z.string(),
  title: z.string().nullable(),
  excerpt: z.string().nullable(),
  reachable: z.boolean(),
  error: z.string().nullable(),
  origin: SourceOrigin,
  fetchedAt: z.iso.datetime(),
})
export type SourceDto = z.infer<typeof SourceDto>
