import type { RenderedPrompt } from '@ai-post-recipe/prompts'

import type { LlmUsage } from '../llm/llm.provider.js'

export interface ImageRequest {
  prompt: RenderedPrompt
  /** e.g. "4:5" for feed posts, "9:16" for stories. */
  aspectRatio: string
}

export interface ImageResult {
  data: Buffer
  mimeType: string
  model: string
  usage: LlmUsage
}

/** Generates a background image; never text, logos or products. */
export interface ImageProvider {
  readonly name: 'openrouter' | 'fake'
  generate(request: ImageRequest): Promise<ImageResult>
}
