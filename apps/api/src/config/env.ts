import { z } from 'zod'

const Env = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
})

const parsed = Env.safeParse(process.env)

if (!parsed.success) {
  console.error(
    'Invalid environment variables:\n' + z.prettifyError(parsed.error),
  )
  process.exit(1)
}

export const env = parsed.data
