import { z } from 'zod'

import { LlmRequestError } from '../../lib/phase-errors.js'

export interface OpenRouterOptions {
  apiKey: string
  baseUrl?: string
  timeoutMs?: number
  maxAttempts?: number
  retryDelayMs?: number
  fetch?: typeof fetch
}

const ErrorBody = z.object({ error: z.object({ message: z.string() }) })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class OpenRouterClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly maxAttempts: number
  private readonly retryDelayMs: number
  private readonly fetchFn: typeof fetch

  constructor(private readonly options: OpenRouterOptions) {
    this.baseUrl = options.baseUrl ?? 'https://openrouter.ai/api/v1'
    this.timeoutMs = options.timeoutMs ?? 120_000
    this.maxAttempts = options.maxAttempts ?? 3
    this.retryDelayMs = options.retryDelayMs ?? 1000
    this.fetchFn = options.fetch ?? globalThis.fetch
  }

  async post(body: object): Promise<unknown> {
    let lastError: unknown
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await this.fetchFn(
          `${this.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.options.apiKey}`,
              'Content-Type': 'application/json',
              'X-Title': 'AI Post Recipe',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeoutMs),
          },
        )
        const json: unknown = await response.json().catch(() => undefined)
        if (response.ok) return json

        const message =
          ErrorBody.safeParse(json).data?.error.message ?? response.statusText
        const error = `OpenRouter ${response.status}: ${message}`
        if (response.status !== 429 && response.status < 500) {
          throw new LlmRequestError(error)
        }
        lastError = new Error(error)
      } catch (error) {
        if (error instanceof LlmRequestError) throw error
        lastError = error
      }
      if (attempt < this.maxAttempts) {
        await sleep(this.retryDelayMs * 2 ** (attempt - 1))
      }
    }
    const reason =
      lastError instanceof Error ? lastError.message : String(lastError)
    throw new Error(
      `OpenRouter request failed after ${this.maxAttempts} tries: ${reason}`,
    )
  }
}
