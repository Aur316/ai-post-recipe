import type { RenderedPrompt } from '@ai-post-recipe/prompts'

import type { LlmImage, LlmUsage } from '../llm/llm.provider.js'

export interface ImageRequest {
  prompt: RenderedPrompt
  /** e.g. "4:5" for feed posts, "9:16" for stories. */
  aspectRatio: string
  /** Input images for the model, e.g. a website screenshot to draw the scene from. */
  images?: Array<LlmImage>
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
