import type { PromptLibrary } from '@ai-post-recipe/prompts'
import type {
  Brief,
  PhaseKey,
  PhaseOutputs,
  PostFormat,
} from '@ai-post-recipe/shared'
import type { z } from 'zod'

import type { PageCapturer } from '../../providers/capture/page-capturer.js'
import type { PageFetcher } from '../../providers/fetcher/web-fetcher.js'
import type { ImageProvider } from '../../providers/image/image.provider.js'
import type {
  LlmImage,
  LlmProvider,
  LlmUsage,
} from '../../providers/llm/llm.provider.js'
import type { SlideRenderer } from '../../providers/renderer/slide-renderer.js'
import type { SearchProvider } from '../../providers/search/search.provider.js'
import type { Upload } from './images.js'

/** What a phase may use; tests pass fakes. */
export interface PhaseTools {
  llm: LlmProvider
  prompts: PromptLibrary
  search: SearchProvider
  fetcher: PageFetcher
  /** The run's uploads as stored, for slides. */
  loadUploads(): Promise<Array<Upload>>
  images: ImageProvider
  renderer: SlideRenderer
  /** Screenshots of the brand's website, when the style comes from it. */
  capturer: PageCapturer
  /** Stores a file the phase made and returns its asset id. */
  saveAsset(
    kind:
      | 'GENERATED_BACKGROUND'
      | 'RENDERED_SLIDE'
      | 'EXPORT_ZIP'
      | 'CAPTURED_SCREENSHOT',
    data: Buffer,
    mimeType: string,
  ): Promise<string>
  /** The posts as they are now, with caption edits and regenerated slides. */
  loadPosts(): Promise<Array<RunPost>>
  /** A stored file of the run, with its size for images. */
  readAsset(id: string): Promise<{
    data: Buffer
    mimeType: string
    width: number | null
    height: number | null
  }>
  /** The hand-over ZIP, built from the run's current state. */
  buildExport(): Promise<{ data: Buffer; files: number }>
}

export interface RunPost {
  index: number
  format: PostFormat
  goal: string
  concept: string
  product: string
  slides: Array<{ order: number; text: string; assetId: string | null }>
}

export interface PhaseContext extends PhaseTools {
  runId: string
  brief: Brief
  /** Outputs of earlier finished phases; the edited version where a person approved one. */
  outputs: Partial<PhaseOutputs>
}

export interface PhaseResult<T> {
  output: T
  promptId?: string
  model?: string
  usage?: LlmUsage
}

/** One step of the recipe. A phase only computes; the runner saves and advances. */
export interface Phase<K extends PhaseKey = PhaseKey> {
  key: K
  outputSchema: z.ZodType<PhaseOutputs[K]>
  execute(ctx: PhaseContext): Promise<PhaseResult<PhaseOutputs[K]>>
}

/** Renders a prompt from the library, calls the model and maps the result. */
export async function runPrompt<T extends z.ZodType>(
  ctx: PhaseContext,
  promptName: string,
  schema: T,
  values: Record<string, unknown>,
  images?: Array<LlmImage>,
): Promise<PhaseResult<z.infer<T>>> {
  const prompt = ctx.prompts.render(promptName, values)
  const result = await ctx.llm.complete({ prompt, schema, images })
  return { ...result, promptId: prompt.promptId }
}

export const LANGUAGE_NAMES: Record<Brief['language'], string> = {
  hr: 'Croatian',
  en: 'English',
}
