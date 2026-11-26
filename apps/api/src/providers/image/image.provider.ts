import type { RenderedPrompt } from '@ai-post-recipe/prompts'

import type { LlmImage, LlmUsage } from '../llm/llm.provider.js'

export interface ImageRequest {
  prompt: RenderedPrompt
  aspectRatio: string
  images?: Array<LlmImage>
}

export interface ImageResult {
  data: Buffer
  mimeType: string
  model: string
  usage: LlmUsage
}

export interface ImageProvider {
  readonly name: 'openrouter' | 'fake'
  generate(request: ImageRequest): Promise<ImageResult>
}
