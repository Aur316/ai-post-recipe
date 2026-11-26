import {
  Brief,
  type PhaseOutputs,
  type ResearchSource,
} from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { FakeLlmProvider } from '../../providers/llm/fake-llm.provider.js'
import { png } from '../../test/context.js'
import { gymbeamBrief } from '../../test/fixtures.js'
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
    const logo = await png(10, 10)
    const outputs: Partial<PhaseOutputs> = {
      RESEARCH: {
        captures: [],
        queries: [],
        sources: [
          source('https://gymbeam.hr'),
          source('https://gymbeam.hr/gone', false),
        ],
      },
    }

    const result = await analysisPhase.execute(
      phaseContext({
        llm,
        outputs,
        loadUploads: () =>
          Promise.resolve([
            { id: 'l', kind: 'UPLOAD_LOGO', mimeType: 'image/png', data: logo },
          ]),
      }),
    )

    expect(result.promptId).toBe('analysis@v3')
    expect(result.output.claims.map((c) => [c.status, c.sourceUrl])).toEqual([
      ['verified', 'https://gymbeam.hr/'],
      ['assumption', null],
      ['assumption', null],
      ['assumption', null],
    ])
    const request = llm.requests[0]
    expect(request?.images?.map((i) => i.label)).toEqual(['Image 1: Logo'])
    expect(request?.prompt.system).toContain(
      'Write every text value in Croatian',
    )
    expect(request?.prompt.user).toContain('Text of https://gymbeam.hr')
    expect(request?.prompt.user).toContain('"unreachable": "HTTP 404"')
    expect(request?.prompt.user).toContain('Image 1: Logo')
  })

  it('in website mode uses the website screenshots and colours, plus logo and products, not other uploads', async () => {
    const llm = new FakeLlmProvider({ analysis: () => answer })
    const image = await png(20, 10)
    const brief = Brief.parse({ ...gymbeamBrief(), styleSource: 'WEBSITE' })
    const outputs: Partial<PhaseOutputs> = {
      RESEARCH: {
        queries: [],
        sources: [source('https://gymbeam.hr')],
        captures: [
          {
            url: 'https://gymbeam.hr',
            assetIds: ['cap-1', 'cap-2'],
            colors: ['#FF4100', '#2CB35B'],
            error: null,
          },
          {
            url: 'https://gymbeam.hr/x',
            assetIds: [],
            colors: [],
            error: 'Timeout',
          },
        ],
      },
    }
    const upload = (kind: 'UPLOAD_LOGO' | 'UPLOAD_SCREENSHOT') => ({
      id: kind,
      kind,
      mimeType: 'image/png',
      data: image,
    })

    await analysisPhase.execute(
      phaseContext({
        llm,
        brief,
        outputs,
        loadUploads: () =>
          Promise.resolve([upload('UPLOAD_LOGO'), upload('UPLOAD_SCREENSHOT')]),
        readAsset: () =>
          Promise.resolve({
            data: image,
            mimeType: 'image/jpeg',
            width: 20,
            height: 10,
          }),
      }),
    )

    const request = llm.requests[0]
    expect(request?.images?.map((i) => i.label)).toEqual([
      'Image 1: Logo',
      "Image 2: Screenshot of the brand's website, https://gymbeam.hr (part 1, top to bottom)",
      "Image 3: Screenshot of the brand's website, https://gymbeam.hr (part 2, top to bottom)",
    ])
    expect(request?.prompt.user).toContain('#FF4100, #2CB35B')
  })
})
