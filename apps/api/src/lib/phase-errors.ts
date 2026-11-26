import type { LlmUsage } from '../providers/llm/llm.provider.js'

/**
 * A phase failure that another attempt cannot fix (a rejected API key, the cost
 * cap). The phase runner fails the phase at once instead of retrying.
 */
export class PermanentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/** The model's answer did not match the schema, even after one correction. */
export class LlmOutputError extends Error {
  constructor(
    message: string,
    /** Tokens and cost of the failed calls, so they are still counted. */
    readonly usage: LlmUsage,
  ) {
    super(message)
    this.name = new.target.name
  }
}

/** OpenRouter refused the request for a reason a retry will not fix (401, 402, 400). */
export class LlmRequestError extends PermanentError {}

export class CostCapError extends PermanentError {}
