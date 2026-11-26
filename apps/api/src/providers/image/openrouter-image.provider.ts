import { z } from 'zod'

import { LlmOutputError } from '../../lib/phase-errors.js'
import {
  OpenRouterClient,
  type OpenRouterOptions,
} from '../llm/openrouter.client.js'
import type {
  ImageProvider,
  ImageRequest,
  ImageResult,
} from './image.provider.js'

const ImageCompletion = z.object({
  model: z.string(),
  choices: z
    .array(
      z.object({
        message: z.object({
          images: z
            .array(z.object({ image_url: z.object({ url: z.string() }) }))
            .optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
})

const DATA_URL = /^data:(image\/[\w+.-]+);base64,(.+)$/

export class OpenRouterImageProvider implements ImageProvider {
  readonly name = 'openrouter'
  private readonly client: OpenRouterClient

  constructor(options: OpenRouterOptions) {
    this.client = new OpenRouterClient(options)
  }

  async generate({
    prompt,
    aspectRatio,
    images = [],
  }: ImageRequest): Promise<ImageResult> {
    const json = await this.client.post({
      model: prompt.model,
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: aspectRatio },
      messages: [
        { role: 'system', content: prompt.system },
        {
          role: 'user',
          content: images.length
            ? [
                { type: 'text', text: prompt.user },
                ...images.flatMap((image) => [
                  { type: 'text', text: image.label },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${image.mimeType};base64,${image.data.toString('base64')}`,
                    },
                  },
                ]),
              ]
            : prompt.user,
        },
      ],
      usage: { include: true },
    })
    const completion = ImageCompletion.parse(json)
    const usage = {
      tokensIn: completion.usage?.prompt_tokens ?? 0,
      tokensOut: completion.usage?.completion_tokens ?? 0,
      costUsd: completion.usage?.cost ?? 0,
    }
    const url = completion.choices[0]?.message.images?.[0]?.image_url.url ?? ''
    const match = DATA_URL.exec(url)
    if (!match?.[1] || !match[2]) {
      throw new LlmOutputError('The image model returned no image', usage)
    }
    return {
      data: Buffer.from(match[2], 'base64'),
      mimeType: match[1],
      model: completion.model,
      usage,
    }
  }
}
