import { z } from 'zod'

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.object({
    database: z.boolean(),
    storage: z.boolean(),
  }),
  providers: z.object({
    llm: z.enum(['openrouter', 'fake']),
    search: z.enum(['serper', 'none']),
  }),
})

export type HealthResponse = z.infer<typeof HealthResponse>
