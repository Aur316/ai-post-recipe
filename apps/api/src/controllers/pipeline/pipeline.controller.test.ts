import {
  ErrorResponse,
  PHASE_ORDER,
  type PhaseKey,
  RunDetailDto,
  RunSummaryDto,
} from '@ai-post-recipe/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { FakeLlmProvider } from '../../providers/llm/fake-llm.provider.js'
import { createTestContext } from '../../test/context.js'
import { gymbeamBrief } from '../../test/fixtures.js'

const setup = (options?: Parameters<typeof createTestContext>[0]) => {
  const ctx = createTestContext(options)

  const createRun = async () => {
    const res = await request(ctx.app).post('/api/runs').send(gymbeamBrief())
    const run = RunSummaryDto.parse(res.body)
    ctx.track(run.id)
    return run.id
  }
  const get = async (id: string) =>
    RunDetailDto.parse((await request(ctx.app).get(`/api/runs/${id}`)).body)
  const phase = async (id: string, key: PhaseKey) =>
    (await get(id)).phases.find((p) => p.phase === key)
  const post = (path: string, body?: object) =>
    request(ctx.app).post(path).send(body)

  return { ctx, createRun, get, phase, post }
}

describe('pipeline', () => {
  const { ctx, createRun, get, phase, post } = setup()

  it('runs all eight phases, stopping twice for approval', async () => {
    const id = await createRun()

    expect((await post(`/api/runs/${id}/start`)).status).toBe(202)
    await ctx.queue.drain()

    let run = await get(id)
    expect(run.status).toBe('AWAITING_APPROVAL')
    expect(run.phases.map((p) => [p.phase, p.status])).toEqual([
      ['BRIEF', 'DONE'],
      ['RESEARCH', 'DONE'],
      ['ANALYSIS', 'AWAITING_APPROVAL'],
    ])

    const analysis = (await phase(id, 'ANALYSIS'))?.output as { tone: string }
    const edited = { ...analysis, tone: 'Friendly and expert' }
    expect(
      (
        await post(`/api/runs/${id}/phases/ANALYSIS/approve`, {
          editedOutput: edited,
        })
      ).status,
    ).toBe(202)
    await ctx.queue.drain()
    expect((await phase(id, 'PLAN'))?.status).toBe('AWAITING_APPROVAL')

    await post(`/api/runs/${id}/phases/PLAN/approve`)
    await ctx.queue.drain()

    run = await get(id)
    expect(run.status).toBe('COMPLETED')
    expect(run.phases.map((p) => p.phase)).toEqual([...PHASE_ORDER])
    const approved = run.phases.find((p) => p.phase === 'ANALYSIS')
    expect(approved).toMatchObject({
      status: 'APPROVED',
      editedOutput: { tone: 'Friendly and expert' },
      output: { tone: analysis.tone },
      promptId: 'analysis@v0',
      model: 'fake',
    })
  })

  it('refuses illegal transitions with 409', async () => {
    const id = await createRun()

    const approveEarly = await post(`/api/runs/${id}/phases/ANALYSIS/approve`)
    expect(approveEarly.status).toBe(409)
    expect(ErrorResponse.parse(approveEarly.body).error.code).toBe(
      'PHASE_NOT_AWAITING_APPROVAL',
    )

    await post(`/api/runs/${id}/start`)
    const startTwice = await post(`/api/runs/${id}/start`)
    expect(startTwice.status).toBe(409)
    expect(ErrorResponse.parse(startTwice.body).error.code).toBe(
      'RUN_IN_PROGRESS',
    )

    await ctx.queue.drain()
    expect((await post(`/api/runs/${id}/start`)).status).toBe(409)
  })

  it('rejects an edited output that does not fit the phase schema', async () => {
    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()

    const res = await post(`/api/runs/${id}/phases/ANALYSIS/approve`, {
      editedOutput: { tone: 42 },
    })
    expect(res.status).toBe(400)
    expect((await phase(id, 'ANALYSIS'))?.status).toBe('AWAITING_APPROVAL')
  })

  it('re-runs a phase as a new attempt and marks later phases stale', async () => {
    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()
    await post(`/api/runs/${id}/phases/ANALYSIS/approve`)
    await ctx.queue.drain()

    expect((await post(`/api/runs/${id}/phases/RESEARCH/rerun`)).status).toBe(
      202,
    )
    let run = await get(id)
    expect(run.status).toBe('RUNNING')
    expect(run.phases.find((p) => p.phase === 'RESEARCH')).toMatchObject({
      attempt: 2,
      status: 'PENDING',
    })
    expect(
      run.phases
        .filter((p) => ['ANALYSIS', 'PLAN'].includes(p.phase))
        .map((p) => p.status),
    ).toEqual(['STALE', 'STALE'])

    await ctx.queue.drain()
    run = await get(id)
    expect(run.phases.find((p) => p.phase === 'ANALYSIS')).toMatchObject({
      attempt: 2,
      status: 'AWAITING_APPROVAL',
    })
  })

  it('returns 400 for an unknown phase', async () => {
    const id = await createRun()
    expect((await post(`/api/runs/${id}/phases/NOPE/rerun`)).status).toBe(400)
  })
})

describe('pipeline retries', () => {
  it('retries a failed attempt and then succeeds', async () => {
    let calls = 0
    const flaky = new FakeLlmProvider()
    const complete = flaky.complete.bind(flaky)
    flaky.complete = (req) => {
      calls++
      return calls === 1 ? Promise.reject(new Error('timeout')) : complete(req)
    }
    const { ctx, createRun, phase, post } = setup({ llm: flaky })

    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()

    expect(await phase(id, 'ANALYSIS')).toMatchObject({
      status: 'AWAITING_APPROVAL',
      attempt: 1,
      error: null,
    })
  })

  it('fails the phase and the run when retries run out', async () => {
    const { ctx, createRun, get, phase, post } = setup({
      llm: new FakeLlmProvider({}),
      retryLimit: 1,
    })

    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()

    expect(await phase(id, 'ANALYSIS')).toMatchObject({
      status: 'FAILED',
      error: 'No fake answer for prompt analysis@v0',
    })
    expect((await get(id)).status).toBe('FAILED')

    // Start resumes from the failed phase.
    expect((await post(`/api/runs/${id}/start`)).status).toBe(202)
    expect((await phase(id, 'ANALYSIS'))?.attempt).toBe(2)
  })
})
