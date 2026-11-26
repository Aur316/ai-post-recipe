import type { LlmUsage } from '../providers/llm/llm.provider.js'

export class PermanentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class LlmOutputError extends Error {
  constructor(
    message: string,
    readonly usage: LlmUsage,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class LlmRequestError extends PermanentError {}

export class CostCapError extends PermanentError {}
