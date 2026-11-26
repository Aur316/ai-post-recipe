import sharp from 'sharp'
import { afterAll } from 'vitest'

import { createApp } from '../app.js'
import { createDb } from '../db/prisma.js'
import { registerWorkers } from '../jobs/phase-runner.js'
import { FakeLlmProvider } from '../providers/llm/fake-llm.provider.js'
import type { LlmProvider } from '../providers/llm/llm.provider.js'
import { MemoryQueue } from '../providers/queue/memory.queue.js'
import { MemoryStorage } from '../providers/storage/memory.storage.js'
import { RunRepo } from '../repositories/run/run.repo.js'
import { phases } from '../services/phases/index.js'

/** A valid UUID that no row has. */
export const UNKNOWN_ID = '0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

/** Real PostgreSQL, in-memory storage. Runs created here are deleted after the file. */
export function createTestContext(
  options: { llm?: LlmProvider; retryLimit?: number } = {},
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
  void registerWorkers({ db, queue, llm, phases })
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
    app: createApp({ db, storage, queue }),
    /** Deletes this run after the test file, e.g. one created through the API. */
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
