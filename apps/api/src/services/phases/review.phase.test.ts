import type { PhaseOutputs } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { FakeImageProvider } from '../../providers/image/fake-image.provider.js'
import { FakeLlmProvider } from '../../providers/llm/fake-llm.provider.js'
import { FakeRenderer } from '../../providers/renderer/fake.renderer.js'
import { png } from '../../test/context.js'
import { phaseContext } from '../../test/phase-context.js'
import { reviewPhase } from './review.phase.js'

const posts = [
  {
    index: 1,
    format: 'CAROUSEL' as const,
    goal: 'Saves',
    concept: 'c',
    product: 'Kreatin',
    slides: [
      { order: 1, text: 'Prvi', assetId: 'a1' },
      { order: 2, text: 'Drugi', assetId: 'a2' },
    ],
  },
  {
    index: 2,
    format: 'IMAGE' as const,
    goal: 'Interest',
    concept: 'c',
    product: 'Whey',
    slides: [{ order: 1, text: 'Slika', assetId: 'small' }],
  },
]

const outputs: Partial<PhaseOutputs> = {
  COPY: {
    posts: [],
    unsupported: [
      {
        postIndex: 1,
        place: 'caption',
        kind: 'number',
        value: '40',
        context: '40% popusta',
      },
    ],
  },
}

describe('review phase', () => {
  it('checks sizes, makes a failing slide again once, and scores the result', async () => {
    let reviews = 0
    const llm = new FakeLlmProvider({
      // First review: post 1 slide 2 fails; the second review passes it.
      review: (request) => {
        reviews++
        const second = reviews > 1
        return {
          slides: [
            ...request.prompt.user.matchAll(/post (\d+), slide (\d+) of/g),
          ].map((m) => {
            const failing = !second && m[1] === '1' && m[2] === '2'
            return {
              postIndex: Number(m[1]),
              order: Number(m[2]),
              passed: !failing,
              issues: failing ? ['Text overlaps the shelf'] : [],
            }
          }),
        }
      },
    })
    const images = new FakeImageProvider()
    const renderer = new FakeRenderer()
    const feed = await png(1080, 1350)
    const small = await png(500, 500)

    const result = await reviewPhase.execute(
      phaseContext({
        llm,
        images,
        renderer,
        outputs,
        loadPosts: () => Promise.resolve(structuredClone(posts)),
        readAsset: (id) =>
          Promise.resolve(
            id === 'small'
              ? { data: small, mimeType: 'image/png', width: 500, height: 500 }
              : {
                  data: feed,
                  mimeType: 'image/png',
                  width: 1080,
                  height: 1350,
                },
          ),
        saveAsset: (kind) => Promise.resolve(`${kind}-new`),
      }),
    )

    expect(reviews).toBe(2)
    // The failing slide got a new background with the issue as its instruction.
    expect(images.requests).toHaveLength(1)
    expect(images.requests[0]?.prompt.user).toContain('Text overlaps the shelf')
    expect(result.output.replaced).toEqual([
      {
        postIndex: 1,
        order: 2,
        assetId: 'RENDERED_SLIDE-new',
        backgroundAssetId: 'GENERATED_BACKGROUND-new',
      },
    ])
    expect(result.output.slides).toEqual([
      expect.objectContaining({
        postIndex: 1,
        order: 1,
        passed: true,
        regenerated: false,
      }),
      expect.objectContaining({
        postIndex: 1,
        order: 2,
        passed: true,
        regenerated: true,
      }),
      // Wrong size: a rule issue fails the slide whatever the model says.
      expect.objectContaining({
        postIndex: 2,
        order: 1,
        passed: false,
        ruleIssues: ['The image is 500×500 px instead of 1080×1350'],
      }),
    ])
    expect(result.output.score).toBeCloseTo(2 / 3)
    expect(result.output.issues).toEqual([
      'Post 1, caption: "40" appears in no source',
    ])
    expect(result.promptId).toBe('review@v1')
  })
})
