import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createDb } from '../../db/prisma.js'
import { PgBossQueue } from './pg-boss.queue.js'

describe('PgBossQueue', () => {
  const url = process.env.DATABASE_URL ?? ''
  const db = createDb(url)
  const queue = new PgBossQueue(url, {
    retryLimit: 0,
    retryDelaySeconds: 0,
    expireInSeconds: 120,
  })
  const name = `test-${Date.now()}`
  const received: Array<string> = []

  beforeAll(async () => {
    await queue.start()
    await queue.work<{ value: string }>(name, ({ data }) => {
      received.push(data.value)
      return Promise.resolve()
    })
  })

  afterAll(async () => {
    await queue.stop()
    await db.$disconnect()
  })

  it('delivers a job sent in a committed transaction, not one rolled back', async () => {
    await db.$transaction(async (tx) => {
      await queue.send(name, { value: 'committed' }, { tx })
    })
    await expect(
      db.$transaction(async (tx) => {
        await queue.send(name, { value: 'rolled back' }, { tx })
        throw new Error('rollback')
      }),
    ).rejects.toThrow('rollback')

    await expect
      .poll(() => received, { timeout: 10_000 })
      .toContain('committed')
    expect(received).not.toContain('rolled back')
  })

  it('runs jobs of different runs at the same time', async () => {
    const parallel = `${name}-parallel`
    let running = 0
    let peak = 0
    await queue.work<{ value: string }>(parallel, async () => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      running -= 1
    })

    await Promise.all(
      ['a', 'b'].map((value) => queue.send(parallel, { value })),
    )

    await expect.poll(() => peak, { timeout: 10_000 }).toBe(2)
  })

  it('gives every job the expiry, so a job whose worker stopped is retried soon', async () => {
    await queue.send(name, { value: 'expiry' })

    const rows = await db.$queryRaw<Array<{ expire_seconds: number }>>`
      SELECT expire_seconds FROM pgboss.job
      WHERE name = ${name} AND data->>'value' = 'expiry'`
    expect(rows.map((r) => Number(r.expire_seconds))).toEqual([120])
  })
})
