import { z } from 'zod'

import { logger } from '../../lib/logger.js'
import { LlmOutputError } from '../../lib/phase-errors.js'
import { toStructuredSchema } from './json-schema.js'
import {
  type LlmProvider,
  type LlmRequest,
  type LlmUsage,
  NO_USAGE,
  addUsage,
} from './llm.provider.js'
import {
  OpenRouterClient,
  type OpenRouterOptions,
} from './openrouter.client.js'

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

const unfence = (text: string) =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

export class OpenRouterProvider implements LlmProvider {
  readonly name = 'openrouter'
  private readonly client: OpenRouterClient

  constructor(options: OpenRouterOptions) {
    this.client = new OpenRouterClient(options)
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
    for (let round = 0; round < 2; round++) {
      const completion = await this.request({
        model: prompt.model,
        ...(prompt.temperature === undefined
          ? {}
          : { temperature: prompt.temperature }),
        max_tokens: prompt.maxTokens,
        messages,
        response_format: responseFormat,
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

  private async request(body: object) {
    const completion = Completion.parse(await this.client.post(body))
    return {
      model: completion.model,
      content: completion.choices[0]?.message.content ?? null,
      usage: toUsage(completion.usage),
    }
  }
}

function toUsage(usage: z.infer<typeof Completion>['usage']): LlmUsage {
  return {
    tokensIn: usage?.prompt_tokens ?? 0,
    tokensOut: usage?.completion_tokens ?? 0,
    costUsd: usage?.cost ?? 0,
  }
}

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
