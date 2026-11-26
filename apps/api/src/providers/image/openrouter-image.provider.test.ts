import type { RenderedPrompt } from '@ai-post-recipe/prompts'
import { describe, expect, it } from 'vitest'

import { OpenRouterImageProvider } from './openrouter-image.provider.js'

const prompt: RenderedPrompt = {
  promptId: 'background@v4',
  model: 'some/image-model',
  maxTokens: 1000,
  system: 'System text',
  user: 'User text',
}

/** Answers with one generated image and records the request body. */
function stub() {
  const bodies: Array<Record<string, unknown>> = []
  const fn = (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(init?.body as string) as Record<string, unknown>)
    return Promise.resolve(
      new Response(
        JSON.stringify({
          model: 'some/image-model',
          choices: [
            {
              message: {
                images: [{ image_url: { url: 'data:image/png;base64,aW1n' } }],
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.04 },
        }),
        { status: 200 },
      ),
    )
  }
  const provider = new OpenRouterImageProvider({
    apiKey: 'test-key',
    fetch: fn,
    retryDelayMs: 0,
  })
  return { provider, bodies }
}

describe('OpenRouterImageProvider', () => {
  it('sends the prompt alone when there is no input image', async () => {
    const { provider, bodies } = stub()

    const result = await provider.generate({ prompt, aspectRatio: '4:5' })

    expect(result).toMatchObject({
      mimeType: 'image/png',
      model: 'some/image-model',
    })
    expect(result.data.toString()).toBe('img')
    expect(bodies[0]?.messages).toEqual([
      { role: 'system', content: 'System text' },
      { role: 'user', content: 'User text' },
    ])
  })

  it('sends input images after the prompt, each with its label', async () => {
    const { provider, bodies } = stub()

    await provider.generate({
      prompt,
      aspectRatio: '4:5',
      images: [
        {
          label: 'Website screenshot',
          mimeType: 'image/jpeg',
          data: Buffer.from('shot'),
        },
      ],
    })

    expect(bodies[0]?.messages).toEqual([
      { role: 'system', content: 'System text' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'User text' },
          { type: 'text', text: 'Website screenshot' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${Buffer.from('shot').toString('base64')}`,
            },
          },
        ],
      },
    ])
  })
})
