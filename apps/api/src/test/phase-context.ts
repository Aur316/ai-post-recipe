import { PromptLibrary } from '@ai-post-recipe/prompts'
import { Brief } from '@ai-post-recipe/shared'

import { FakeImageProvider } from '../providers/image/fake-image.provider.js'
import { FakeLlmProvider } from '../providers/llm/fake-llm.provider.js'
import type { LlmImage } from '../providers/llm/llm.provider.js'
import { FakeRenderer } from '../providers/renderer/fake.renderer.js'
import { NoopSearchProvider } from '../providers/search/search.provider.js'
import type { PhaseContext } from '../services/phases/phase.js'
import { FakeFetcher } from './context.js'
import { gymbeamBrief } from './fixtures.js'

/** A phase context with fakes; override what a test needs. */
export function phaseContext(
  overrides: Partial<PhaseContext> = {},
): PhaseContext {
  return {
    runId: 'run-1',
    brief: Brief.parse(gymbeamBrief()),
    outputs: {},
    llm: new FakeLlmProvider(),
    prompts: PromptLibrary.load(),
    search: new NoopSearchProvider(),
    fetcher: new FakeFetcher(),
    loadImages: () => Promise.resolve<Array<LlmImage>>([]),
    loadUploads: () => Promise.resolve([]),
    images: new FakeImageProvider(),
    renderer: new FakeRenderer(),
    saveAsset: (kind) => Promise.resolve(`${kind}-${crypto.randomUUID()}`),
    loadPosts: () => Promise.resolve([]),
    readAsset: () =>
      Promise.reject(new Error('No assets in this test context')),
    buildExport: () => Promise.resolve({ data: Buffer.from('zip'), files: 1 }),
    ...overrides,
  }
}
