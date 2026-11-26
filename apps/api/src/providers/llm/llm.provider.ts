import type { z } from 'zod'

export interface LlmUsage {
  tokensIn: number
  tokensOut: number
  costUsd: number
}

export interface LlmRequest<T extends z.ZodType> {
  /** Prompt id and version, e.g. analysis@v1; stored on the phase run. */
  promptId: string
  schema: T
  input: unknown
}

export interface LlmResult<T> {
  output: T
  model: string
  usage: LlmUsage
}

/** Structured-output LLM calls. OpenRouterProvider arrives in M5. */
export interface LlmProvider {
  complete<T extends z.ZodType>(
    request: LlmRequest<T>,
  ): Promise<LlmResult<z.infer<T>>>
}
