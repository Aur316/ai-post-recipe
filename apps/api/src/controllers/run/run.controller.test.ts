import {
  DEFAULT_PAGE_SIZE,
  ErrorResponse,
  MAX_PAGE_SIZE,
  RunDetailDto,
  RunListResponse,
  RunSummaryDto,
} from '@ai-post-recipe/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { UNKNOWN_ID, createTestContext, png } from '../../test/context.js'
import { gymbeamBrief } from '../../test/fixtures.js'

describe('runs', () => {
  const ctx = createTestContext()

  const createRun = async (brief: object = gymbeamBrief()) => {
    const res = await request(ctx.app).post('/api/runs').send(brief)
    if (res.status === 201) ctx.track((res.body as { id: string }).id)
    return res
  }

  it('creates a draft run from a valid brief', async () => {
    const res = await createRun()

    expect(res.status).toBe(201)
    expect(RunSummaryDto.parse(res.body)).toMatchObject({
      brandName: 'GymBeam Hrvatska',
      instagram: 'https://www.instagram.com/gymbeamhr/',
      language: 'hr',
      status: 'DRAFT',
    })
  })

  it('creates a run without an Instagram profile, and with the website as style source', async () => {
    const res = await createRun({
      ...gymbeamBrief(),
      instagramUrl: '',
      styleSource: 'WEBSITE',
    })

    expect(res.status).toBe(201)
    const { id } = RunSummaryDto.parse(res.body)
    const run = RunDetailDto.parse(
      (await request(ctx.app).get(`/api/runs/${id}`)).body,
    )
    expect(run.brief).toMatchObject({
      instagramUrl: '',
      styleSource: 'WEBSITE',
    })
  })

  it('rejects an invalid brief with field errors', async () => {
    const res = await createRun({
      ...gymbeamBrief(),
      instagramUrl: 'https://facebook.com/gymbeam',
      products: [],
    })

    expect(res.status).toBe(400)
    const { error } = ErrorResponse.parse(res.body)
    const paths = (error.details as Array<{ path: Array<string> }>).map((i) =>
      i.path.join('.'),
    )
    expect(paths).toEqual(expect.arrayContaining(['instagramUrl', 'products']))
  })

  it('lists runs newest first, one page at a time', async () => {
    const first = RunSummaryDto.parse((await createRun()).body)
    const second = RunSummaryDto.parse((await createRun()).body)

    const page1 = RunListResponse.parse(
      (await request(ctx.app).get('/api/runs?page=1&size=1')).body,
    )
    const page2 = RunListResponse.parse(
      (await request(ctx.app).get('/api/runs?page=2&size=1')).body,
    )

    expect(page1.items.map((r) => r.id)).toEqual([second.id])
    expect(page2.items.map((r) => r.id)).toEqual([first.id])
    expect(page1).toMatchObject({ page: 1, size: 1 })
    expect(page1.totalPages).toBe(page1.total)
  })

  it('searches by brand name, ignoring case', async () => {
    const brand = `Searchable ${crypto.randomUUID().slice(0, 8)}`
    const { id } = RunSummaryDto.parse(
      (await createRun({ ...gymbeamBrief(), brandName: brand })).body,
    )

    const res = await request(ctx.app)
      .get('/api/runs')
      .query({ search: brand.toUpperCase() })

    const list = RunListResponse.parse(res.body)
    expect(list.items.map((r) => r.id)).toEqual([id])
    expect(list.total).toBe(1)
  })

  it('uses the default page size', async () => {
    const res = await request(ctx.app).get('/api/runs')

    expect(RunListResponse.parse(res.body).size).toBe(DEFAULT_PAGE_SIZE)
  })

  it.each(['size=0', `size=${MAX_PAGE_SIZE + 1}`, 'page=0', 'page=abc'])(
    'rejects an invalid page query (%s)',
    async (query) => {
      expect((await request(ctx.app).get(`/api/runs?${query}`)).status).toBe(
        400,
      )
    },
  )

  it('returns a run with its brief and uploads', async () => {
    const { id } = RunSummaryDto.parse((await createRun()).body)
    await request(ctx.app)
      .post(`/api/runs/${id}/assets`)
      .field('kind', 'UPLOAD_LOGO')
      .attach('file', await png(), {
        filename: 'logo.png',
        contentType: 'image/png',
      })

    const res = await request(ctx.app).get(`/api/runs/${id}`)

    expect(res.status).toBe(200)
    const run = RunDetailDto.parse(res.body)
    expect(run.brief.products[0]?.name).toBe('True Whey')
    expect(run.assets.map((a) => a.kind)).toEqual(['UPLOAD_LOGO'])
  })

  describe('editing the brief', () => {
    const edited = () => ({
      ...gymbeamBrief(),
      brandName: 'GymBeam HR',
      audience: 'Students who train at home',
      language: 'en',
    })

    it('replaces the brief of a run that has not started', async () => {
      const { id } = RunSummaryDto.parse((await createRun()).body)

      const res = await request(ctx.app).put(`/api/runs/${id}`).send(edited())

      expect(res.status).toBe(200)
      const run = RunDetailDto.parse(res.body)
      expect(run).toMatchObject({
        brandName: 'GymBeam HR',
        language: 'en',
        status: 'DRAFT',
      })
      expect(run.brief.audience).toBe('Students who train at home')
    })

    it('refuses once the run has started', async () => {
      const { id } = RunSummaryDto.parse((await createRun()).body)
      await request(ctx.app).post(`/api/runs/${id}/start`)

      const res = await request(ctx.app).put(`/api/runs/${id}`).send(edited())

      expect(res.status).toBe(409)
      expect(ErrorResponse.parse(res.body).error.code).toBe(
        'RUN_ALREADY_STARTED',
      )
      const run = RunDetailDto.parse(
        (await request(ctx.app).get(`/api/runs/${id}`)).body,
      )
      expect(run.brandName).toBe('GymBeam Hrvatska')
    })

    it('rejects an invalid brief', async () => {
      const { id } = RunSummaryDto.parse((await createRun()).body)

      const res = await request(ctx.app)
        .put(`/api/runs/${id}`)
        .send({ ...edited(), products: [] })

      expect(res.status).toBe(400)
    })

    describe('deleting', () => {
      it('deletes the run, its rows and its stored files', async () => {
        const { id } = RunSummaryDto.parse((await createRun()).body)
        await request(ctx.app)
          .post(`/api/runs/${id}/assets`)
          .field('kind', 'UPLOAD_LOGO')
          .attach('file', await png(), {
            filename: 'logo.png',
            contentType: 'image/png',
          })
        await request(ctx.app).post(`/api/runs/${id}/start`)
        await ctx.queue.drain()
        expect(
          [...ctx.storage.objects.keys()].some((k) => k.includes(id)),
        ).toBe(true)

        const res = await request(ctx.app).delete(`/api/runs/${id}`)

        expect(res.status).toBe(204)
        expect((await request(ctx.app).get(`/api/runs/${id}`)).status).toBe(404)
        expect(await ctx.db.phaseRun.count({ where: { runId: id } })).toBe(0)
        expect(await ctx.db.asset.count({ where: { runId: id } })).toBe(0)
        expect(
          [...ctx.storage.objects.keys()].some((k) => k.includes(id)),
        ).toBe(false)
      })

      it('refuses while a phase is running', async () => {
        const { id } = RunSummaryDto.parse((await createRun()).body)
        await request(ctx.app).post(`/api/runs/${id}/start`)

        const res = await request(ctx.app).delete(`/api/runs/${id}`)

        expect(res.status).toBe(409)
        expect(ErrorResponse.parse(res.body).error.code).toBe('RUN_IN_PROGRESS')
        await ctx.queue.drain()
      })

      it('returns 404 for an unknown run', async () => {
        expect(
          (await request(ctx.app).delete(`/api/runs/${UNKNOWN_ID}`)).status,
        ).toBe(404)
      })
    })

    it('returns 404 for an unknown run', async () => {
      const res = await request(ctx.app)
        .put(`/api/runs/${UNKNOWN_ID}`)
        .send(edited())

      expect(res.status).toBe(404)
    })
  })

  it('returns 404 for an unknown run', async () => {
    expect((await request(ctx.app).get(`/api/runs/${UNKNOWN_ID}`)).status).toBe(
      404,
    )
  })

  it('returns 400 for a malformed id', async () => {
    expect((await request(ctx.app).get('/api/runs/not-a-uuid')).status).toBe(
      400,
    )
  })

  it('creates runs with time-ordered UUID v7 ids', async () => {
    const { id } = RunSummaryDto.parse((await createRun()).body)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
})
