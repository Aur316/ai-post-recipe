import { z } from 'zod'

/** An empty value in .env counts as not set. */
const optionalKey = z
  .string()
  .optional()
  .transform((v) => v?.trim() || undefined)

const Env = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  /** Without it the pipeline uses recorded fake answers. */
  OPENROUTER_API_KEY: optionalKey,
  /** Without it research reads only the brief's links. */
  SERPER_API_KEY: optionalKey,
  /** No LLM call starts once a run has spent this much (USD). */
  MAX_COST_USD_PER_RUN: z.coerce.number().positive().default(2),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
})

export type Env = z.infer<typeof Env>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = Env.safeParse(source)
  if (!parsed.success) {
    throw new Error(
      'Invalid environment variables:\n' + z.prettifyError(parsed.error),
    )
  }
  return parsed.data
}
