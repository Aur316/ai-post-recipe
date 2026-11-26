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

export class CostMeter {
  usage: LlmUsage = NO_USAGE

  constructor(
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
