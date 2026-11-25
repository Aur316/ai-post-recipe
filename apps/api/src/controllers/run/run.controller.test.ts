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

import { createTestContext, png } from '../../test/context.js'
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

  it('returns 404 for an unknown run', async () => {
    expect((await request(ctx.app).get('/api/runs/missing')).status).toBe(404)
  })
})
