import type { PromptLibrary } from '@ai-post-recipe/prompts'
import type { Brief, PhaseKey, PhaseOutputs } from '@ai-post-recipe/shared'
import type { z } from 'zod'

import type { PageFetcher } from '../../providers/fetcher/web-fetcher.js'
import type {
  LlmImage,
  LlmProvider,
  LlmUsage,
} from '../../providers/llm/llm.provider.js'
import type { SearchProvider } from '../../providers/search/search.provider.js'

/** What a phase may use; tests pass fakes. */
export interface PhaseTools {
  llm: LlmProvider
  prompts: PromptLibrary
  search: SearchProvider
  fetcher: PageFetcher
  /** The run's uploaded images, ready to send to a vision model. */
  loadImages(): Promise<Array<LlmImage>>
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
