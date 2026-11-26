import { z } from 'zod'

/** Keywords some structured-output providers reject; Zod still checks them afterwards. */
const UNSUPPORTED = new Set([
  '$schema',
  'minItems',
  'maxItems',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
])

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean)
  if (!node || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'properties' && value && typeof value === 'object') {
      // Field names, not keywords: a field may be called "format" or "pattern".
      out[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([name, field]) => [name, clean(field)],
        ),
      )
    } else if (!UNSUPPORTED.has(key)) {
      out[key] = clean(value)
    }
  }
  // Strict mode needs every object closed.
  if (out.type === 'object' && !('additionalProperties' in out)) {
    out.additionalProperties = false
  }
  return out
}

/** A JSON schema for structured output that most models on OpenRouter accept. */
export function toStructuredSchema(schema: z.ZodType) {
  return clean(z.toJSONSchema(schema, { io: 'output', target: 'draft-7' }))
}
