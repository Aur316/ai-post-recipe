import { Brief } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import type {
  SearchOptions,
  SearchProvider,
} from '../../providers/search/search.provider.js'
import { FakeFetcher } from '../../test/context.js'
import { gymbeamBrief } from '../../test/fixtures.js'
import { phaseContext } from '../../test/phase-context.js'
import {
  MAX_SOURCES,
  mentionsBrand,
  normalizeUrl,
  researchPhase,
  searchQueries,
} from './research.phase.js'

class FakeSearch implements SearchProvider {
  readonly name = 'serper'
  readonly calls: Array<{ query: string; options?: SearchOptions }> = []
  constructor(private readonly results: Record<string, Array<string>>) {}
  search(query: string, options?: SearchOptions) {
    this.calls.push({ query, options })
    return Promise.resolve(
      (this.results[query] ?? []).map((url) => ({
        title: `Found ${url}`,
        url,
        snippet: '',
      })),
    )
  }
}

describe('research phase', () => {
  it('reads the brief links and product pages without a search key', async () => {
    const fetcher = new FakeFetcher({
      'https://gymbeam.hr/true-whey': {
        reachable: false,
        error: 'HTTP 404',
        text: '',
      },
    })

    const { output } = await researchPhase.execute(phaseContext({ fetcher }))

    expect(output.queries).toEqual([])
    expect(
      output.sources.map((s) => [s.url, s.origin, s.reachable, s.error]),
    ).toEqual([
      ['https://gymbeam.hr', 'BRIEF', true, null],
      ['https://gymbeam.hr/true-whey', 'BRIEF', false, 'HTTP 404'],
    ])
    expect(output.sources[0]?.text).toBe('Text of https://gymbeam.hr')
  })

  it('adds search results, without duplicates or social networks', async () => {
    const brief = Brief.parse(gymbeamBrief())
    const search = new FakeSearch({
      'GymBeam Hrvatska': [
        'https://gymbeam.hr/',
        'https://www.instagram.com/gymbeamhr',
        'https://blog.example/gymbeam',
        'https://www.gymbeam.hr/kreatin?srsltid=abc&utm_source=x&page=2',
      ],
      'GymBeam Hrvatska True Whey': [
        'https://gymbeam.hr/true-whey#reviews',
        'https://gymbeam.hr/true-whey?review-page=3',
        // Names neither the brand nor its site: an unrelated company.
        'https://other-company.example/true-whey',
        'https://review.example/gymbeam-true-whey',
      ],
    })
    const fetcher = new FakeFetcher()

    const { output } = await researchPhase.execute(
      phaseContext({ brief, search, fetcher }),
    )

    expect(output.queries).toEqual(searchQueries(brief))
    expect(search.calls[0]?.options).toMatchObject({
      language: 'hr',
      country: 'hr',
    })
    // The brand's own pages first, without tracking parameters.
    expect(output.sources.map((s) => [s.url, s.origin])).toEqual([
      ['https://gymbeam.hr', 'BRIEF'],
      ['https://gymbeam.hr/true-whey', 'BRIEF'],
      ['https://www.gymbeam.hr/kreatin?page=2', 'SEARCH'],
      ['https://blog.example/gymbeam', 'SEARCH'],
      ['https://review.example/gymbeam-true-whey', 'SEARCH'],
    ])
    expect(fetcher.requested).toHaveLength(5)
    expect(fetcher.requested).not.toContain(
      'https://other-company.example/true-whey',
    )
  })

  it('lists a social link from the brief as unreachable without fetching it', async () => {
    const brief = Brief.parse({
      ...gymbeamBrief(),
      links: [{ type: 'OTHER', url: 'https://www.facebook.com/gymbeam' }],
      products: [{ name: 'True Whey' }],
    })
    const fetcher = new FakeFetcher()

    const { output } = await researchPhase.execute(
      phaseContext({ brief, fetcher }),
    )

    expect(output.sources[0]).toMatchObject({ reachable: false })
    expect(output.sources[0]?.error).toContain('screenshots')
    expect(fetcher.requested).toEqual([])
  })

  it('keeps going when the search fails, and reads at most MAX_SOURCES pages', async () => {
    const search: SearchProvider = {
      name: 'serper',
      search: () => Promise.reject(new Error('Serper 500')),
    }
    const brief = Brief.parse({
      ...gymbeamBrief(),
      links: Array.from({ length: MAX_SOURCES + 3 }, (_, i) => ({
        type: 'OTHER',
        url: `https://site${i}.example`,
      })),
    })

    const { output } = await researchPhase.execute(
      phaseContext({ brief, search }),
    )

    expect(output.sources).toHaveLength(MAX_SOURCES)
  })

  it('treats URLs that differ only in hash, slash or host case as one', () => {
    expect(normalizeUrl('https://GymBeam.hr/a/#x')).toBe(
      normalizeUrl('https://gymbeam.hr/a'),
    )
  })
})

describe('mentionsBrand', () => {
  it.each([
    ['GymBeam Hrvatska', 'GymBeam BCAA price', true],
    // Spaces and punctuation do not matter.
    ['GymBeam Hrvatska', 'Gym Beam review', true],
    ['Revyan', 'EliseAI: AI for property management', false],
    ['Dida Boža', 'dida-boza.hr shop', true],
  ])('%s in "%s" → %s', (brand, title, expected) => {
    expect(
      mentionsBrand({ title, snippet: '', url: 'https://x.example/' }, brand),
    ).toBe(expected)
  })
})

describe('searchQueries', () => {
  it('does not repeat the brand when the product already names it', () => {
    const brief = Brief.parse({
      ...gymbeamBrief(),
      brandName: 'Revyan',
      products: [
        { name: 'Revyan work management' },
        { name: 'Elyse AI assistant' },
      ],
    })
    expect(searchQueries(brief)).toEqual([
      'Revyan',
      'Revyan work management',
      'Revyan Elyse AI assistant',
    ])
  })
})
