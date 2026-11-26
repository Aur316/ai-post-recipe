import type { RenderedPrompt } from '@ai-post-recipe/prompts'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { LlmOutputError, LlmRequestError } from '../../lib/phase-errors.js'
import { OpenRouterProvider } from './openrouter.provider.js'

const prompt: RenderedPrompt = {
  promptId: 'test@v1',
  model: 'some/model',
  maxTokens: 1000,
  system: 'System text',
  user: 'User text',
}
const Schema = z.object({ tone: z.string(), score: z.number() })

const completion = (content: string, cost = 0.01) =>
  new Response(
    JSON.stringify({
      model: 'some/model-2026',
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 100, completion_tokens: 20, cost },
    }),
    { status: 200 },
  )

function scripted(...responses: Array<Response | Error>) {
  const bodies: Array<Record<string, unknown>> = []
  const fn = (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(init?.body as string) as Record<string, unknown>)
    const next = responses.shift()
    if (!next) throw new Error('No more responses')
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  }
  return { fn: fn as typeof fetch, bodies }
}

const provider = (fn: typeof fetch) =>
  new OpenRouterProvider({ apiKey: 'test-key', fetch: fn, retryDelayMs: 0 })

describe('OpenRouterProvider', () => {
  it('returns the parsed output with model and usage', async () => {
    const { fn, bodies } = scripted(completion('{"tone":"calm","score":3}'))

    const result = await provider(fn).complete({
      prompt,
      schema: Schema,
      images: [
        {
          label: 'Image 1: Logo',
          mimeType: 'image/png',
          data: Buffer.from('png'),
        },
      ],
    })

    expect(result).toEqual({
      output: { tone: 'calm', score: 3 },
      model: 'some/model-2026',
      usage: { tokensIn: 100, tokensOut: 20, costUsd: 0.01 },
    })
    const body = bodies[0] as {
      model: string
      response_format: { json_schema: { strict: boolean } }
      messages: Array<{ role: string; content: unknown }>
    }
    expect(body.model).toBe('some/model')
    expect(body).toMatchObject({ max_tokens: 1000 })
    expect(body).not.toHaveProperty('temperature')
    expect(body.response_format.json_schema.strict).toBe(true)
    expect(body.messages[1]?.content).toEqual([
      { type: 'text', text: 'User text' },
      { type: 'text', text: 'Image 1: Logo' },
      {
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${Buffer.from('png').toString('base64')}`,
        },
      },
    ])
  })

  it('accepts JSON in a code fence', async () => {
    const { fn } = scripted(
      completion('```json\n{"tone":"calm","score":1}\n```'),
    )
    expect(
      (await provider(fn).complete({ prompt, schema: Schema })).output.score,
    ).toBe(1)
  })

  it('sends an invalid answer back once with the errors, and adds up the cost', async () => {
    const { fn, bodies } = scripted(
      completion('{"tone":"calm"}', 0.01),
      completion('{"tone":"calm","score":2}', 0.02),
    )

    const result = await provider(fn).complete({ prompt, schema: Schema })

    expect(result.output.score).toBe(2)
    expect(result.usage.costUsd).toBeCloseTo(0.03)
    const retry = bodies[1] as {
      messages: Array<{ role: string; content: string }>
    }
    expect(retry.messages.at(-1)?.content).toContain('score')
  })

  it('fails with the usage when the second answer is invalid too', async () => {
    const { fn } = scripted(
      completion('nope', 0.01),
      completion('{"tone":1}', 0.01),
    )

    const error = await provider(fn)
      .complete({ prompt, schema: Schema })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(LlmOutputError)
    expect((error as LlmOutputError).usage.costUsd).toBeCloseTo(0.02)
  })

  it('retries 429, 5xx and network errors', async () => {
    const { fn, bodies } = scripted(
      new Response('{"error":{"message":"Rate limited"}}', { status: 429 }),
      new Error('socket hang up'),
      completion('{"tone":"calm","score":3}'),
    )
    expect(
      (await provider(fn).complete({ prompt, schema: Schema })).output.tone,
    ).toBe('calm')
    expect(bodies).toHaveLength(3)
  })

  it('does not retry a refused request such as a bad key', async () => {
    const { fn, bodies } = scripted(
      new Response('{"error":{"message":"No auth credentials found"}}', {
        status: 401,
      }),
    )
    await expect(
      provider(fn).complete({ prompt, schema: Schema }),
    ).rejects.toThrow(LlmRequestError)
    await expect(
      provider(
        scripted(new Response('{"error":{"message":"x"}}', { status: 401 })).fn,
      ).complete({
        prompt,
        schema: Schema,
      }),
    ).rejects.toThrow('OpenRouter 401: x')
    expect(bodies).toHaveLength(1)
  })

  it('gives up after the last try', async () => {
    const { fn } = scripted(
      new Error('down'),
      new Error('down'),
      new Error('down'),
    )
    await expect(
      provider(fn).complete({ prompt, schema: Schema }),
    ).rejects.toThrow('OpenRouter request failed after 3 tries: down')
  })
})
