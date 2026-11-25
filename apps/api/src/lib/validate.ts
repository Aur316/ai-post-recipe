import type { z } from 'zod'

import { ValidationError } from './errors.js'

export function validate<T extends z.ZodType>(schema: T, value: unknown) {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new ValidationError('Request validation failed', result.error.issues)
  }
  return result.data
}
