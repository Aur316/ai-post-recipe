import type { PhaseOutputs, ResearchSource } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { FakeLlmProvider } from '../../providers/llm/fake-llm.provider.js'
import { phaseContext } from '../../test/phase-context.js'
import { analysisPhase } from './analysis.phase.js'

const source = (url: string, reachable = true): ResearchSource => ({
  url,
  title: url,
  excerpt: '',
  text: reachable ? `Text of ${url}` : '',
  reachable,
  error: reachable ? null : 'HTTP 404',
  origin: 'BRIEF',
  fetchedAt: '2026-11-26T10:00:00.000Z',
})

const claim = (
  text: string,
  status: 'verified' | 'assumption',
  sourceUrl: string | null,
) => ({
  text,
  status,
  sourceUrl,
  evidence: sourceUrl ? 'quote' : null,
})

describe('analysis phase', () => {
  const answer = {
    summary: 's',
    tone: 't',
    audience: 'a',
    themes: [],
    visualStyle: 'v',
    colors: [{ hex: '#FF6600', name: 'Orange', usage: 'accents' }],
    productPresentation: 'p',
    peoplePresentation: 'p',
    claims: [
      claim('Read on the shop page', 'verified', 'https://gymbeam.hr/'),
      claim(
        'Cites a page that could not be read',
        'verified',
        'https://gymbeam.hr/gone',
      ),
      claim(
        'Cites a page that was never fetched',
        'verified',
        'https://elsewhere.example',
      ),
      claim('A guess', 'assumption', null),
    ],
    gaps: [],
  }

  it('sends the sources and images, and keeps only claims backed by a read page as verified', async () => {
    const llm = new FakeLlmProvider({ analysis: () => answer })
    const images = [
      { label: 'Image 1: Logo', mimeType: 'image/png', data: Buffer.from('x') },
    ]
    const outputs: Partial<PhaseOutputs> = {
      RESEARCH: {
        queries: [],
        sources: [
          source('https://gymbeam.hr'),
          source('https://gymbeam.hr/gone', false),
        ],
      },
    }

    const result = await analysisPhase.execute(
      phaseContext({ llm, outputs, loadImages: () => Promise.resolve(images) }),
    )

    expect(result.promptId).toBe('analysis@v2')
    expect(result.output.claims.map((c) => [c.status, c.sourceUrl])).toEqual([
      ['verified', 'https://gymbeam.hr/'],
      ['assumption', null],
      ['assumption', null],
      ['assumption', null],
    ])
    const request = llm.requests[0]
    expect(request?.images).toEqual(images)
    // The brief is Croatian, so the whole analysis is asked for in Croatian.
    expect(request?.prompt.system).toContain(
      'Write every text value in Croatian',
    )
    expect(request?.prompt.user).toContain('Text of https://gymbeam.hr')
    expect(request?.prompt.user).toContain('"unreachable": "HTTP 404"')
    expect(request?.prompt.user).toContain('Image 1: Logo')
  })
})
