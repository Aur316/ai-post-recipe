import sharp from 'sharp'
import { afterAll } from 'vitest'

import { createApp } from '../app.js'
import { createDb } from '../db/prisma.js'
import { MemoryStorage } from '../providers/storage/memory.storage.js'
import { RunRepo } from '../repositories/run/run.repo.js'

/** Real PostgreSQL, in-memory storage. Runs created here are deleted after the file. */
export function createTestContext() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required for API tests')

  const db = createDb(url)
  const storage = new MemoryStorage()
  const runs = new RunRepo(db)
  const created: Array<string> = []

  afterAll(async () => {
    await db.run.deleteMany({ where: { id: { in: created } } })
    await db.$disconnect()
  })

  return {
    db,
    storage,
    app: createApp({ db, storage }),
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
