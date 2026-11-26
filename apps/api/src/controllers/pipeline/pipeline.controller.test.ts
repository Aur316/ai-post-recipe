import {
  ErrorResponse,
  PHASE_ORDER,
  type PhaseKey,
  PostDto,
  RunDetailDto,
  RunListResponse,
  RunSummaryDto,
} from '@ai-post-recipe/shared'
import { strFromU8, unzipSync } from 'fflate'
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

describe('posts', () => {
  it('creates the posts from the approved plan, with edits, and fills in the copy', async () => {
    const { ctx, createRun, get, phase, post } = setup()

    const id = await createRun()
    await post(`/api/runs/${id}/start`)
    await ctx.queue.drain()
    await post(`/api/runs/${id}/phases/ANALYSIS/approve`)
    await ctx.queue.drain()
    expect((await get(id)).posts).toEqual([])

    const plan = (await phase(id, 'PLAN'))?.output as {
      posts: Array<{ concept: string }>
    }
    const edited = {
      posts: plan.posts.map((p, i) =>
        i === 0 ? { ...p, concept: 'Edited concept' } : p,
      ),
    }
    await post(`/api/runs/${id}/phases/PLAN/approve`, { editedOutput: edited })
    await ctx.queue.drain()

    const run = await get(id)
    expect(
      run.posts.map((p) => [p.index, p.format, p.concept, p.product]),
    ).toEqual([
      [1, 'IMAGE', 'Edited concept', 'True Whey'],
      [2, 'CAROUSEL', 'Concept for post 2', 'True Whey'],
      [3, 'IMAGE', 'Concept for post 3', 'True Whey'],
    ])
    expect(run.posts[0]).toMatchObject({
      caption: 'Caption for post 1',
      hashtags: ['#gymbeam', '#fitness'],
      slides: [{ order: 1, text: 'Slide text for post 1' }],
    })
    expect((await phase(id, 'COPY'))?.output).toMatchObject({ unsupported: [] })
  })
})

describe('slides', () => {
  const runToEnd = async (s: ReturnType<typeof setup>) => {
    const id = await s.createRun()
    await s.post(`/api/runs/${id}/start`)
    await s.ctx.queue.drain()
    await s.post(`/api/runs/${id}/phases/ANALYSIS/approve`)
    await s.ctx.queue.drain()
    await s.post(`/api/runs/${id}/phases/PLAN/approve`)
    await s.ctx.queue.drain()
    return id
  }

  it('renders a PNG for every slide and puts it on the post', async () => {
    const s = setup()
    const id = await runToEnd(s)

    const run = await s.get(id)
    expect(run.status).toBe('COMPLETED')
    // Fake copy: one slide text per post.
    expect(run.posts.map((p) => p.slides.map((sl) => !!sl.assetId))).toEqual([
      [true],
      [true],
      [true],
    ])
    const assetId = run.posts[0]?.slides[0]?.assetId ?? ''
    const png = await request(s.ctx.app).get(`/api/assets/${assetId}`)
    expect(png.status).toBe(200)
    expect(png.headers['content-type']).toBe('image/png')
    expect(run.assets.map((a) => a.kind).sort()).toEqual([
      'EXPORT_ZIP',
      ...Array<string>(3).fill('GENERATED_BACKGROUND'),
      ...Array<string>(3).fill('RENDERED_SLIDE'),
    ])
  })

  it('regenerates one slide with an instruction', async () => {
    const s = setup()
    const id = await runToEnd(s)
    const before = (await s.get(id)).posts[1]?.slides[0]?.assetId

    const res = await s.post(`/api/runs/${id}/posts/2/slides/1/regenerate`, {
      instruction: 'darker background',
    })

    expect(res.status).toBe(200)
    const after = PostDto.parse(res.body).slides[0]?.assetId
    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
    expect(s.ctx.images.requests.at(-1)?.prompt.user).toContain(
      'darker background',
    )
    // The other posts keep their slides.
    expect((await s.get(id)).posts[0]?.slides[0]?.assetId).toBeTruthy()
  })

  it('refuses to regenerate a slide that has not been rendered', async () => {
    const s = setup()
    const id = await s.createRun()

    const res = await s.post(`/api/runs/${id}/posts/1/slides/1/regenerate`)
    expect(res.status).toBe(404)
  })

  it('saves an edited caption and hashtags', async () => {
    const s = setup()
    const id = await runToEnd(s)

    const res = await request(s.ctx.app)
      .patch(`/api/runs/${id}/posts/1`)
      .send({ caption: 'My caption', hashtags: ['#mine'] })

    expect(res.status).toBe(200)
    expect(PostDto.parse(res.body)).toMatchObject({
      caption: 'My caption',
      hashtags: ['#mine'],
    })
    const bad = await request(s.ctx.app)
      .patch(`/api/runs/${id}/posts/1`)
      .send({ caption: 'x', hashtags: ['no hash'] })
    expect(bad.status).toBe(400)
  })
})

describe('export', () => {
  it('downloads a ZIP with a folder per post, sources and every phase', async () => {
    const s = setup()
    const id = await s.createRun()
    await s.post(`/api/runs/${id}/start`)
    await s.ctx.queue.drain()
    await s.post(`/api/runs/${id}/phases/ANALYSIS/approve`)
    await s.ctx.queue.drain()
    await s.post(`/api/runs/${id}/phases/PLAN/approve`)
    await s.ctx.queue.drain()
    await request(s.ctx.app)
      .patch(`/api/runs/${id}/posts/1`)
      .send({ caption: 'Edited caption', hashtags: ['#edited'] })

    const res = await request(s.ctx.app)
      .get(`/api/runs/${id}/export`)
      .buffer(true)
      .parse((r, done) => {
        const chunks: Array<Buffer> = []
        r.on('data', (c: Buffer) => chunks.push(c))
        r.on('end', () => done(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('application/zip')
    expect(res.headers['content-disposition']).toContain(
      'gymbeam-hrvatska-posts.zip',
    )
    const files = unzipSync(new Uint8Array(res.body as Buffer))
    const names = Object.keys(files).sort()
    expect(names).toEqual(
      expect.arrayContaining([
        'README.md',
        'brief.json',
        'sources.md',
        'post-1-image/slide-1.png',
        'post-1-image/caption.txt',
        'post-1-image/meta.json',
        'post-2-carousel/slide-1.png',
        'phases/03-analysis.json',
        'phases/08-export.json',
      ]),
    )
    // The ZIP follows later edits.
    expect(
      strFromU8(files['post-1-image/caption.txt'] ?? new Uint8Array()),
    ).toBe('Edited caption\n\n#edited\n')
    expect(
      JSON.parse(
        strFromU8(files['post-2-carousel/meta.json'] ?? new Uint8Array()),
      ),
    ).toMatchObject({
      format: 'CAROUSEL',
      goal: 'More saves',
      slides: [{ order: 1, file: 'slide-1.png' }],
    })
    expect(
      (await s.get(id)).phases.find((p) => p.phase === 'EXPORT')?.output,
    ).toMatchObject({
      files: expect.any(Number) as number,
    })
  })

  it('refuses a run without posts', async () => {
    const s = setup()
    const id = await s.createRun()
    const res = await request(s.ctx.app).get(`/api/runs/${id}/export`)
    expect(res.status).toBe(409)
  })
})

describe('usage', () => {
  it('adds up tokens and cost over every attempt, per phase and per run', async () => {
    const llm = new FakeLlmProvider(undefined, {
      tokensIn: 100,
      tokensOut: 10,
      costUsd: 0.01,
    })
    const s = setup({ llm })
    const id = await s.createRun()
    await s.post(`/api/runs/${id}/start`)
    await s.ctx.queue.drain()
    // Run the analysis twice: both attempts count.
    await s.post(`/api/runs/${id}/phases/ANALYSIS/rerun`)
    await s.ctx.queue.drain()

    const run = await s.get(id)
    const analysis = run.usageByPhase.find((p) => p.phase === 'ANALYSIS')
    expect(analysis).toMatchObject({
      attempts: 2,
      tokensIn: 200,
      tokensOut: 20,
    })
    expect(analysis?.costUsd).toBeCloseTo(0.02)
    expect(run.usage).toMatchObject({ tokensIn: 200, tokensOut: 20 })

    const list = RunListResponse.parse(
      (await request(s.ctx.app).get('/api/runs?size=50')).body,
    )
    expect(list.items.find((r) => r.id === id)?.usage.tokensIn).toBe(200)
  })
})
