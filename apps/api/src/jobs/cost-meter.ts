import type { z } from 'zod'

import { CostCapError, LlmOutputError } from '../lib/phase-errors.js'
import type {
  ImageProvider,
  ImageRequest,
} from '../providers/image/image.provider.js'
import {
  type LlmProvider,
  type LlmRequest,
  type LlmUsage,
  NO_USAGE,
  addUsage,
} from '../providers/llm/llm.provider.js'

/**
 * Adds up the usage of every AI call in one phase attempt (failed ones too)
 * and refuses a call once the run has spent its budget.
 */
export class CostMeter {
  usage: LlmUsage = NO_USAGE

  constructor(
    /** Cost of the run before this attempt. */
    private readonly spentBefore: number,
    private readonly capUsd: number,
  ) {}

  check() {
    const spent = this.spentBefore + this.usage.costUsd
    if (spent >= this.capUsd) {
      throw new CostCapError(
        `Cost cap reached: the run has spent $${spent.toFixed(4)} of MAX_COST_USD_PER_RUN $${this.capUsd.toFixed(2)}`,
      )
    }
  }

  add(usage: LlmUsage) {
    this.usage = addUsage(this.usage, usage)
  }

  /** Runs one call: checks the budget first, counts the usage after. */
  async call<T extends { usage: LlmUsage }>(run: () => Promise<T>) {
    this.check()
    try {
      const result = await run()
      this.add(result.usage)
      return result
    } catch (error) {
      if (error instanceof LlmOutputError) this.add(error.usage)
      throw error
    }
  }
}

export class MeteredLlm implements LlmProvider {
  constructor(
    private readonly inner: LlmProvider,
    private readonly meter: CostMeter,
  ) {}

  get name() {
    return this.inner.name
  }

  complete<T extends z.ZodType>(request: LlmRequest<T>) {
    return this.meter.call(() => this.inner.complete(request))
  }
}

export class MeteredImages implements ImageProvider {
  constructor(
    private readonly inner: ImageProvider,
    private readonly meter: CostMeter,
  ) {}

  get name() {
    return this.inner.name
  }

  generate(request: ImageRequest) {
    return this.meter.call(() => this.inner.generate(request))
  }
}
