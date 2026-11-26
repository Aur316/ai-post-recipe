import type { z } from 'zod'

import { CostCapError, LlmOutputError } from '../lib/phase-errors.js'
import {
  type LlmProvider,
  type LlmRequest,
  type LlmUsage,
  NO_USAGE,
  addUsage,
} from '../providers/llm/llm.provider.js'

/**
 * Wraps the LLM for one phase attempt: adds up the usage of every call (failed
 * ones too) and refuses a call once the run has spent its budget.
 */
export class MeteredLlm implements LlmProvider {
  usage: LlmUsage = NO_USAGE

  constructor(
    private readonly inner: LlmProvider,
    /** Cost of the run before this attempt. */
    private readonly spentBefore: number,
    private readonly capUsd: number,
  ) {}

  get name() {
    return this.inner.name
  }

  async complete<T extends z.ZodType>(request: LlmRequest<T>) {
    const spent = this.spentBefore + this.usage.costUsd
    if (spent >= this.capUsd) {
      throw new CostCapError(
        `Cost cap reached: the run has spent $${spent.toFixed(4)} of MAX_COST_USD_PER_RUN $${this.capUsd.toFixed(2)}`,
      )
    }
    try {
      const result = await this.inner.complete(request)
      this.usage = addUsage(this.usage, result.usage)
      return result
    } catch (error) {
      if (error instanceof LlmOutputError) {
        this.usage = addUsage(this.usage, error.usage)
      }
      throw error
    }
  }
}
