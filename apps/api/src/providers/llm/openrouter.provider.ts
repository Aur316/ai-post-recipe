import { z } from 'zod'

import { logger } from '../../lib/logger.js'
import { LlmOutputError, LlmRequestError } from '../../lib/phase-errors.js'
import { toStructuredSchema } from './json-schema.js'
import {
  type LlmProvider,
  type LlmRequest,
  type LlmUsage,
  NO_USAGE,
  addUsage,
} from './llm.provider.js'

export interface OpenRouterOptions {
  apiKey: string
  baseUrl?: string
  /** Per request; a vision analysis can take a while. */
  timeoutMs?: number
  /** Tries per request on network errors, 429 and 5xx. */
  maxAttempts?: number
  /** First backoff delay; doubles on each try. */
  retryDelayMs?: number
  fetch?: typeof fetch
}

type Message =
  | { role: 'system' | 'assistant'; content: string }
  | {
      role: 'user'
      content:
        | string
        | Array<
            | { type: 'text'; text: string }
            | { type: 'image_url'; image_url: { url: string } }
          >
    }

const Completion = z.object({
  model: z.string(),
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
})

const ErrorBody = z.object({ error: z.object({ message: z.string() }) })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Models sometimes wrap JSON in a Markdown code fence. */
const unfence = (text: string) =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

/**
 * Calls a model through OpenRouter's chat completions API with a JSON schema
 * response format. Network errors, 429 and 5xx are retried with backoff; an
 * answer that does not match the schema is sent back once with the errors.
 */
export class OpenRouterProvider implements LlmProvider {
  readonly name = 'openrouter'
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly maxAttempts: number
  private readonly retryDelayMs: number
  private readonly fetch: typeof fetch

  constructor(private readonly options: OpenRouterOptions) {
    this.baseUrl = options.baseUrl ?? 'https://openrouter.ai/api/v1'
    this.timeoutMs = options.timeoutMs ?? 120_000
    this.maxAttempts = options.maxAttempts ?? 3
    this.retryDelayMs = options.retryDelayMs ?? 1000
    this.fetch = options.fetch ?? globalThis.fetch
  }

  async complete<T extends z.ZodType>({
    prompt,
    schema,
    images = [],
  }: LlmRequest<T>) {
    const messages: Array<Message> = [
      { role: 'system', content: prompt.system },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt.user },
          ...images.flatMap((image) => [
            { type: 'text' as const, text: image.label },
            {
              type: 'image_url' as const,
              image_url: {
                url: `data:${image.mimeType};base64,${image.data.toString('base64')}`,
              },
            },
          ]),
        ],
      },
    ]
    const responseFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'output',
        strict: true,
        schema: toStructuredSchema(schema),
      },
    }

    let usage = NO_USAGE
    let problem = ''
    // The first answer, and one correction with the validation errors.
    for (let round = 0; round < 2; round++) {
      const completion = await this.request({
        model: prompt.model,
        // Only when the prompt sets it: many models refuse a temperature.
        ...(prompt.temperature === undefined
          ? {}
          : { temperature: prompt.temperature }),
        max_tokens: prompt.maxTokens,
        messages,
        response_format: responseFormat,
        // Only route to providers that support structured output.
        provider: { require_parameters: true },
        usage: { include: true },
      })
      usage = addUsage(usage, completion.usage)

      const content = completion.content ?? ''
      problem = validationProblem(schema, content)
      if (!problem) {
        const output = schema.parse(JSON.parse(unfence(content)))
        return { output, model: completion.model, usage }
      }
      logger.warn(
        { model: prompt.model, promptId: prompt.promptId, problem },
        'Invalid model output',
      )
      messages.push(
        { role: 'assistant', content },
        {
          role: 'user',
          content: `Your answer does not match the schema: ${problem}\nAnswer again with the corrected JSON only.`,
        },
      )
    }
    throw new LlmOutputError(
      `The model's answer did not match the schema: ${problem}`,
      usage,
    )
  }

  /** One chat completion, with retries for network errors, 429 and 5xx. */
  private async request(body: object) {
    let lastError: unknown
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'AI Post Recipe',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        })
        const json: unknown = await response.json().catch(() => undefined)

        if (response.ok) {
          const completion = Completion.parse(json)
          return {
            model: completion.model,
            content: completion.choices[0]?.message.content ?? null,
            usage: toUsage(completion.usage),
          }
        }
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

function toUsage(usage: z.infer<typeof Completion>['usage']): LlmUsage {
  return {
    tokensIn: usage?.prompt_tokens ?? 0,
    tokensOut: usage?.completion_tokens ?? 0,
    costUsd: usage?.cost ?? 0,
  }
}

/** Empty when the text is JSON that matches the schema, else what is wrong. */
function validationProblem(schema: z.ZodType, content: string) {
  let value: unknown
  try {
    value = JSON.parse(unfence(content))
  } catch {
    return 'it is not valid JSON'
  }
  const result = schema.safeParse(value)
  if (result.success) return ''
  return result.error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ')
}
