import { PromptLibrary } from '@ai-post-recipe/prompts'
import sharp from 'sharp'
import { afterAll } from 'vitest'

import { createApp } from '../app.js'
import { createDb } from '../db/prisma.js'
import { registerWorkers } from '../jobs/phase-runner.js'
import { FakeCapturer } from '../providers/capture/fake.capturer.js'
import type {
  FetchedPage,
  PageFetcher,
} from '../providers/fetcher/web-fetcher.js'
import { FakeImageProvider } from '../providers/image/fake-image.provider.js'
import { FakeLlmProvider } from '../providers/llm/fake-llm.provider.js'
import type { LlmProvider } from '../providers/llm/llm.provider.js'
import { MemoryQueue } from '../providers/queue/memory.queue.js'
import { FakeRenderer } from '../providers/renderer/fake.renderer.js'
import {
  NoopSearchProvider,
  type SearchProvider,
} from '../providers/search/search.provider.js'
import { MemoryStorage } from '../providers/storage/memory.storage.js'
import { RunRepo } from '../repositories/run/run.repo.js'
import { phases } from '../services/phases/index.js'

export class FakeFetcher implements PageFetcher {
  readonly requested: Array<string> = []

  constructor(
    private readonly pages: Record<string, Partial<FetchedPage>> = {},
  ) {}

  fetchPage(url: string): Promise<FetchedPage> {
    this.requested.push(url)
    return Promise.resolve({
      url,
      title: `Page ${url}`,
      description: '',
      text: `Text of ${url}`,
      reachable: true,
      error: null,
      ...this.pages[url],
    })
  }
}

export const UNKNOWN_ID = '0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

export function createTestContext(
  options: {
    llm?: LlmProvider
    retryLimit?: number
    search?: SearchProvider
    fetcher?: PageFetcher
    costCapUsd?: number
  } = {},
) {
  const url = process.env.DATABASE_URL
  if (!url || !new URL(url).pathname.endsWith('_test')) {
    throw new Error('API tests must run against a *_test database')
  }

  const db = createDb(url)
  const storage = new MemoryStorage()
  const queue = new MemoryQueue({
    retryLimit: options.retryLimit ?? 2,
    retryDelaySeconds: 0,
  })
  const llm = options.llm ?? new FakeLlmProvider()
  const search = options.search ?? new NoopSearchProvider()
  const images = new FakeImageProvider()
  const renderer = new FakeRenderer()
  const prompts = PromptLibrary.load()
  const fetcher = options.fetcher ?? new FakeFetcher()
  void registerWorkers({
    db,
    queue,
    phases,
    llm,
    prompts,
    search,
    fetcher,
    storage,
    images,
    renderer,
    capturer: new FakeCapturer(),
    costCapUsd: options.costCapUsd ?? 100,
  })
  const runs = new RunRepo(db)
  const created: Array<string> = []

  afterAll(async () => {
    await db.run.deleteMany({ where: { id: { in: created } } })
    await db.$disconnect()
  })

  return {
    db,
    storage,
    queue,
    llm,
    images,
    renderer,
    app: createApp({
      db,
      storage,
      queue,
      slides: {
        images,
        renderer,
        prompts,
        costCapUsd: options.costCapUsd ?? 100,
      },
      providers: { llm: llm.name, search: search.name },
    }),
    track(id: string) {
      created.push(id)
    },
    async createRun() {
      const run = await runs.create({
        brandName: 'Test brand',
        instagram: 'https://www.instagram.com/test',
        brief: {},
      })
      created.push(run.id)
      return run
    },
  }
}

export function png(width = 4, height = 3) {
  return sharp({
    create: { width, height, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer()
}
