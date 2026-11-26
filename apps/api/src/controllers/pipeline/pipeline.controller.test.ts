import {
  ErrorResponse,
  PHASE_ORDER,
  type PhaseKey,
  RunDetailDto,
  RunSummaryDto,
} from '@ai-post-recipe/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { LlmOutputError, LlmRequestError } from '../../lib/phase-errors.js'
import { FakeLlmProvider } from '../../providers/llm/fake-llm.provider.js'
import { FakeFetcher, createTestContext } from '../../test/context.js'
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
      promptId: 'analysis@v2',
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
      error: 'No fake answer for prompt analysis',
    })
    expect((await get(id)).status).toBe('FAILED')

    // Start resumes from the failed phase.
    expect((await post(`/api/runs/${id}/start`)).status).toBe(202)
    expect((await phase(id, 'ANALYSIS'))?.attempt).toBe(2)
  })
})

describe('research, costs and errors', () => {
  it('saves the research sources and returns them with the run', async () => {
    const { ctx, createRun, get, post } = setup({
      fetcher: new FakeFetcher({
        'https://gymbeam.hr/true-whey': {
          reachable: false,
          error: 'HTTP 404',
          text: '',
        },
      }),
    })

    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()

    const run = await get(id)
    expect(
      run.sources.map((s) => [s.url, s.origin, s.reachable, s.error]),
    ).toEqual([
      ['https://gymbeam.hr', 'BRIEF', true, null],
      ['https://gymbeam.hr/true-whey', 'BRIEF', false, 'HTTP 404'],
    ])

    // Running research again replaces the sources instead of adding to them.
    await post(`/api/runs/${id}/phases/RESEARCH/rerun`)
    await ctx.queue.drain()
    expect((await get(id)).sources).toHaveLength(2)
  })

  it('stops before an LLM call once the run has spent MAX_COST_USD_PER_RUN', async () => {
    const llm = new FakeLlmProvider(undefined, {
      tokensIn: 10,
      tokensOut: 5,
      costUsd: 1,
    })
    const { ctx, createRun, get, phase, post } = setup({ llm, costCapUsd: 1.5 })

    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()
    expect(await phase(id, 'ANALYSIS')).toMatchObject({
      status: 'AWAITING_APPROVAL',
      costUsd: 1,
      tokensIn: 10,
    })
    await post(`/api/runs/${id}/phases/ANALYSIS/approve`)
    await ctx.queue.drain()
    await post(`/api/runs/${id}/phases/PLAN/approve`)
    await ctx.queue.drain()

    // $2 spent after the plan: the copy phase may not call the model.
    const copy = await phase(id, 'COPY')
    expect(copy).toMatchObject({ status: 'FAILED', attempt: 1 })
    expect(copy?.error).toContain('Cost cap reached')
    expect(llm.requests).toHaveLength(2)
    expect((await get(id)).status).toBe('FAILED')
  })

  it('does not retry an error that a retry cannot fix', async () => {
    const llm = new FakeLlmProvider()
    let calls = 0
    llm.complete = () => {
      calls++
      return Promise.reject(
        new LlmRequestError('OpenRouter 401: No auth credentials found'),
      )
    }
    const { ctx, createRun, phase, post } = setup({ llm, retryLimit: 2 })

    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()

    expect(await phase(id, 'ANALYSIS')).toMatchObject({
      status: 'FAILED',
      error: 'OpenRouter 401: No auth credentials found',
    })
    expect(calls).toBe(1)
  })

  it('keeps the cost of a failed attempt', async () => {
    const llm = new FakeLlmProvider()
    llm.complete = () =>
      Promise.reject(
        new LlmOutputError('Invalid answer', {
          tokensIn: 50,
          tokensOut: 10,
          costUsd: 0.25,
        }),
      )
    const { ctx, createRun, phase, post } = setup({ llm, retryLimit: 0 })

    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()

    expect(await phase(id, 'ANALYSIS')).toMatchObject({
      status: 'FAILED',
      costUsd: 0.25,
      tokensIn: 50,
    })
  })
})
