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

export interface LlmImage {
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

export interface LlmProvider {
  readonly name: 'openrouter' | 'fake'
  complete<T extends z.ZodType>(
    request: LlmRequest<T>,
  ): Promise<LlmResult<z.infer<T>>>
}
