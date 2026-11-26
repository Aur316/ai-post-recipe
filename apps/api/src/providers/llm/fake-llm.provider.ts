import type { z } from 'zod'

import {
  type LlmProvider,
  type LlmRequest,
  type LlmUsage,
  NO_USAGE,
} from './llm.provider.js'

type Fixture = (request: LlmRequest<z.ZodType>) => unknown

const DEFAULT_FIXTURES: Record<string, Fixture> = {
  analysis: () => ({
    summary:
      'A Croatian sports nutrition shop with an energetic, practical voice.',
    tone: 'Energetic, motivating, direct',
    audience: 'Active adults who train regularly',
    themes: ['Training tips', 'Product highlights', 'Healthy recipes'],
    visualStyle: 'Bright product shots on clean backgrounds with bold text',
    colors: [
      { hex: '#FF6600', name: 'Orange', usage: 'Accents and calls to action' },
      { hex: '#111111', name: 'Black', usage: 'Text and backgrounds' },
    ],
    productPresentation: 'Packshots and products in use at the gym',
    peoplePresentation: 'Fit people training; no recurring faces',
    claims: [
      {
        text: 'Sells sports nutrition online',
        status: 'verified',
        sourceUrl: 'https://gymbeam.hr',
        evidence: 'Sports nutrition and supplements',
      },
      {
        text: 'Audience is mostly 18–35',
        status: 'assumption',
        sourceUrl: null,
        evidence: null,
      },
    ],
    gaps: ['No price list was available'],
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
  // Passes every slide listed in the prompt ("post 2, slide 3 of 4").
  review: (request) => ({
    slides: [
      ...request.prompt.user.matchAll(/post (\d+), slide (\d+) of/g),
    ].map((m) => ({
      postIndex: Number(m[1]),
      order: Number(m[2]),
      passed: true,
      issues: [],
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
 * Returns recorded, schema-valid answers per prompt id, without a key or cost.
 * Used in tests and when OPENROUTER_API_KEY is not set.
 */
export class FakeLlmProvider implements LlmProvider {
  readonly name = 'fake'
  /** Every request, for assertions in tests. */
  readonly requests: Array<LlmRequest<z.ZodType>> = []

  constructor(
    private readonly fixtures: Record<string, Fixture> = DEFAULT_FIXTURES,
    /** Usage reported per call, e.g. to test the cost cap. */
    private readonly usage: LlmUsage = NO_USAGE,
  ) {}

  complete<T extends z.ZodType>(request: LlmRequest<T>) {
    this.requests.push(request)
    const id = request.prompt.promptId.split('@')[0] ?? ''
    const fixture = this.fixtures[id]
    if (!fixture) {
      return Promise.reject(new Error(`No fake answer for prompt ${id}`))
    }
    return Promise.resolve({
      output: request.schema.parse(fixture(request)),
      model: 'fake',
      usage: this.usage,
    })
  }
}
