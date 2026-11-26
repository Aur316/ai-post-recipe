import type { z } from 'zod'

import type { LlmProvider, LlmRequest } from './llm.provider.js'

type Fixture = (input: unknown) => unknown

const DEFAULT_FIXTURES: Record<string, Fixture> = {
  analysis: () => ({
    tone: 'Energetic, motivating, direct',
    audience: 'Active adults who train regularly',
    themes: ['Training tips', 'Product highlights', 'Healthy recipes'],
    colors: ['#FF6600', '#111111', '#FFFFFF'],
    claims: [
      {
        text: 'Sells sports nutrition online',
        status: 'verified',
        sourceUrl: 'https://gymbeam.hr',
      },
      { text: 'Audience is mostly 18–35', status: 'assumption' },
    ],
  }),
  plan: () => ({
    posts: [1, 2, 3].map((index) => ({
      index,
      format: index === 2 ? 'CAROUSEL' : 'IMAGE',
      goal: ['Education', 'More saves', 'Product interest'][index - 1],
      concept: `Concept for post ${index}`,
      rationale: `Why post ${index} fits the brand`,
      product: 'True Whey',
    })),
  }),
  copy: () => ({
    posts: [1, 2, 3].map((index) => ({
      index,
      caption: `Caption for post ${index}`,
      hashtags: ['#gymbeam', '#fitness'],
      slides: [{ order: 1, text: `Slide text for post ${index}` }],
    })),
  }),
}

/**
 * Returns recorded, schema-valid answers per prompt (keyed by the part of the
 * prompt id before "@"). Used in tests and until OpenRouter is wired in M5.
 */
export class FakeLlmProvider implements LlmProvider {
  constructor(
    private readonly fixtures: Record<string, Fixture> = DEFAULT_FIXTURES,
  ) {}

  complete<T extends z.ZodType>({ promptId, schema, input }: LlmRequest<T>) {
    const fixture = this.fixtures[promptId.split('@')[0] ?? '']
    if (!fixture) {
      return Promise.reject(new Error(`No fake answer for prompt ${promptId}`))
    }
    return Promise.resolve({
      output: schema.parse(fixture(input)),
      model: 'fake',
      usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 },
    })
  }
}
