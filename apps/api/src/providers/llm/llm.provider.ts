import type { RenderedPrompt } from '@ai-post-recipe/prompts'
import type { z } from 'zod'

export interface LlmUsage {
  tokensIn: number
  tokensOut: number
  costUsd: number
}

export const NO_USAGE: LlmUsage = { tokensIn: 0, tokensOut: 0, costUsd: 0 }

export const addUsage = (a: LlmUsage, b: LlmUsage): LlmUsage => ({
  tokensIn: a.tokensIn + b.tokensIn,
  tokensOut: a.tokensOut + b.tokensOut,
  costUsd: a.costUsd + b.costUsd,
})

/** An image sent with the prompt, e.g. an Instagram screenshot. */
export interface LlmImage {
  /** Shown to the model before the image, e.g. "Image 1: Instagram screenshot". */
  label: string
  mimeType: string
  data: Buffer
}

export interface LlmRequest<T extends z.ZodType> {
  prompt: RenderedPrompt
  schema: T
  images?: Array<LlmImage>
}

export interface LlmResult<T> {
  output: T
  model: string
  usage: LlmUsage
}

/** Structured-output LLM calls; the answer is validated against `schema`. */
export interface LlmProvider {
  readonly name: 'openrouter' | 'fake'
  complete<T extends z.ZodType>(
    request: LlmRequest<T>,
  ): Promise<LlmResult<z.infer<T>>>
}
