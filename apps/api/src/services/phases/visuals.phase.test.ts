import { Brief, type PhaseOutputs } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { FakeImageProvider } from '../../providers/image/fake-image.provider.js'
import { FakeRenderer } from '../../providers/renderer/fake.renderer.js'
import { png } from '../../test/context.js'
import { gymbeamBrief } from '../../test/fixtures.js'
import { phaseContext } from '../../test/phase-context.js'
import { visualsPhase } from './visuals.phase.js'

const outputs: Partial<PhaseOutputs> = {
  PLAN: {
    posts: [
      {
        index: 1,
        format: 'IMAGE',
        goal: 'g',
        concept: 'c1',
        rationale: 'r',
        product: 'True Whey',
      },
      {
        index: 2,
        format: 'CAROUSEL',
        goal: 'g',
        concept: 'c2',
        rationale: 'r',
        product: 'Kreatin',
      },
      {
        index: 3,
        format: 'STORY',
        goal: 'g',
        concept: 'c3',
        rationale: 'r',
        product: 'True Whey',
      },
    ],
  },
  COPY: {
    unsupported: [],
    posts: [1, 2, 3].map((index) => ({
      index,
      caption: `Caption ${index}`,
      hashtags: [],
      slides: [1, 2, 3].map((order) => ({
        order,
        text: `Post ${index} slide ${order}`,
      })),
    })),
  },
}

const productPhoto = await png(8, 8)
const logo = await png(40, 10)

const upload = (kind: 'UPLOAD_LOGO' | 'UPLOAD_PRODUCT', id: string) => ({
  id,
  kind,
  mimeType: 'image/png',
  data: kind === 'UPLOAD_PRODUCT' ? productPhoto : logo,
})

describe('visuals phase', () => {
  it('makes one background per post and renders every slide with the real logo and product', async () => {
    const images = new FakeImageProvider({
      tokensIn: 10,
      tokensOut: 0,
      costUsd: 0.04,
    })
    const renderer = new FakeRenderer()
    const saved: Array<string> = []

    const result = await visualsPhase.execute(
      phaseContext({
        outputs,
        images,
        renderer,
        loadUploads: () =>
          Promise.resolve([
            upload('UPLOAD_LOGO', 'logo'),
            upload('UPLOAD_PRODUCT', 'p1'),
            upload('UPLOAD_PRODUCT', 'p2'),
          ]),
        saveAsset: (kind) => {
          saved.push(kind)
          return Promise.resolve(`${kind}-${saved.length}`)
        },
      }),
    )

    expect(result.output.slides.map((s) => [s.postIndex, s.order])).toEqual([
      [1, 1],
      [2, 1],
      [2, 2],
      [2, 3],
      [3, 1],
      [3, 2],
      [3, 3],
    ])
    expect(images.requests.map((r) => r.aspectRatio)).toEqual([
      '4:5',
      '4:5',
      '9:16',
    ])
    expect(images.requests[1]?.prompt.user).toContain('Kreatin')
    expect(images.requests[1]?.prompt.user).not.toContain('c2')
    expect(images.requests.map((r) => r.images?.[0]?.label)).toEqual(
      ['True Whey', 'Kreatin', 'True Whey'].map(
        (name) =>
          `Product photo: ${name} (place this exact product in the scene)`,
      ),
    )
    expect(result).toMatchObject({ promptId: 'background@v7', model: 'fake' })
    expect(result.usage?.costUsd).toBeCloseTo(0.12)

    const [first] = renderer.rendered
    expect(first).toMatchObject({ format: 'IMAGE', layout: 'cover', total: 1 })
    expect(first).toMatchObject({
      logoUrl: `data:image/png;base64,${logo.toString('base64')}`,
      logoAspect: 4,
    })
    expect(renderer.rendered.map((r) => r.layout).slice(1, 4)).toEqual([
      'cover',
      'text',
      'closing',
    ])
    expect(saved.filter((k) => k === 'GENERATED_BACKGROUND')).toHaveLength(3)
    expect(saved.filter((k) => k === 'RENDERED_SLIDE')).toHaveLength(7)
  })

  it('in website mode gives the image model a website screenshot as input, and keeps it off the slide', async () => {
    const images = new FakeImageProvider()
    const renderer = new FakeRenderer()
    const screenshot = await png(40, 25)

    await visualsPhase.execute(
      phaseContext({
        brief: Brief.parse({ ...gymbeamBrief(), styleSource: 'WEBSITE' }),
        outputs: {
          ...outputs,
          RESEARCH: {
            queries: [],
            sources: [],
            captures: [
              {
                url: 'https://gymbeam.hr',
                assetIds: ['cap-1'],
                colors: [],
                error: null,
              },
            ],
          },
        },
        images,
        renderer,
        loadUploads: () => Promise.resolve([]),
        readAsset: () =>
          Promise.resolve({
            data: screenshot,
            mimeType: 'image/png',
            width: 40,
            height: 25,
          }),
        saveAsset: (kind) => Promise.resolve(kind),
      }),
    )

    expect(images.requests).toHaveLength(3)
    for (const request of images.requests) {
      expect(request.images?.map((i) => i.label)).toEqual([
        "Screenshot of the brand's website (input only)",
      ])
      expect(request.prompt.user).toContain('attached screenshot')
    }
  })
})
