import type { Brief, PhaseKey, PhaseOutputs } from '@ai-post-recipe/shared'
import type { z } from 'zod'

import type { LlmProvider, LlmUsage } from '../../providers/llm/llm.provider.js'

export interface PhaseContext {
  runId: string
  brief: Brief
  /** Outputs of earlier finished phases; the edited version where a person approved one. */
  outputs: Partial<PhaseOutputs>
  llm: LlmProvider
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

/** Runs an LLM prompt and maps its result to a phase result. */
export async function runPrompt<T extends z.ZodType>(
  ctx: PhaseContext,
  promptId: string,
  outputSchema: T,
  input: unknown,
): Promise<PhaseResult<z.infer<T>>> {
  const result = await ctx.llm.complete({
    promptId,
    schema: outputSchema,
    input,
  })
  return { ...result, promptId }
}
