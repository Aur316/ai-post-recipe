import { describe, expect, it } from 'vitest'

import { createTestContext } from '../test/context.js'
import { AssetRepo } from './asset.repo.js'
import { PhaseRunRepo } from './phase-run.repo.js'
import { RunRepo } from './run.repo.js'

describe('RunRepo', () => {
  const ctx = createTestContext()

  it('deletes phases and assets with their run', async () => {
    const run = await ctx.createRun()
    await new PhaseRunRepo(ctx.db).create({ runId: run.id, phase: 'BRIEF' })
    await new AssetRepo(ctx.db).create({
      runId: run.id,
      kind: 'UPLOAD_LOGO',
      storageKey: `runs/${run.id}/logo`,
      mimeType: 'image/png',
      sizeBytes: 1,
    })

    await new RunRepo(ctx.db).delete(run.id)

    expect(await ctx.db.phaseRun.count({ where: { runId: run.id } })).toBe(0)
    expect(await ctx.db.asset.count({ where: { runId: run.id } })).toBe(0)
  })

  it('keeps every attempt of a phase', async () => {
    const run = await ctx.createRun()
    const phases = new PhaseRunRepo(ctx.db)
    await phases.create({ runId: run.id, phase: 'ANALYSIS', attempt: 1 })
    await phases.create({ runId: run.id, phase: 'ANALYSIS', attempt: 2 })

    const attempts = await phases.listByRun(run.id)
    expect(attempts.map((p) => p.attempt)).toEqual([1, 2])
  })
})
