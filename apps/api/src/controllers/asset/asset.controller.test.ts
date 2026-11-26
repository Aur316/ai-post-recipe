import { AssetDto, ErrorResponse } from '@ai-post-recipe/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { UNKNOWN_ID, createTestContext, png } from '../../test/context.js'

describe('assets', () => {
  const ctx = createTestContext()

  const upload = (
    runId: string,
    kind: string,
    file: Buffer,
    type: string,
    name = 'f',
  ) =>
    request(ctx.app)
      .post(`/api/runs/${runId}/assets`)
      .field('kind', kind)
      .attach('file', file, { filename: name, contentType: type })

  it('stores an image with its size and serves it back', async () => {
    const run = await ctx.createRun()
    const image = await png(8, 5)

    const res = await upload(run.id, 'UPLOAD_PRODUCT', image, 'image/png')

    expect(res.status).toBe(201)
    const asset = AssetDto.parse(res.body)
    expect(asset).toMatchObject({
      runId: run.id,
      kind: 'UPLOAD_PRODUCT',
      mimeType: 'image/png',
      width: 8,
      height: 5,
      sizeBytes: image.length,
    })
    expect([...ctx.storage.objects.keys()]).toContain(
      `runs/${run.id}/UPLOAD_PRODUCT/${asset.id}.png`,
    )

    const download = await request(ctx.app)
      .get(`/api/assets/${asset.id}`)
      .buffer(true)
      .parse((r, done) => {
        const chunks: Array<Buffer> = []
        r.on('data', (c: Buffer) => chunks.push(c))
        r.on('end', () => done(null, Buffer.concat(chunks)))
      })
    expect(download.status).toBe(200)
    expect(download.headers['content-type']).toBe('image/png')
    expect(Buffer.compare(download.body as Buffer, image)).toBe(0)
  })

  it('returns 404 for an unknown run', async () => {
    const res = await upload(
      UNKNOWN_ID,
      'UPLOAD_LOGO',
      await png(),
      'image/png',
    )

    expect(res.status).toBe(404)
    expect(ErrorResponse.parse(res.body).error.code).toBe('RUN_NOT_FOUND')
  })

  it('returns 415 for an unsupported type', async () => {
    const run = await ctx.createRun()
    const res = await upload(
      run.id,
      'UPLOAD_OTHER',
      Buffer.from('hi'),
      'text/plain',
    )

    expect(res.status).toBe(415)
  })

  it('allows SVG only for logos', async () => {
    const run = await ctx.createRun()
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    )

    expect(
      (await upload(run.id, 'UPLOAD_PRODUCT', svg, 'image/svg+xml')).status,
    ).toBe(415)
    expect(
      (await upload(run.id, 'UPLOAD_LOGO', svg, 'image/svg+xml')).status,
    ).toBe(201)
  })

  it('returns 413 for a file over 10 MB', async () => {
    const run = await ctx.createRun()
    const big = Buffer.alloc(10 * 1024 * 1024 + 1)

    expect(
      (await upload(run.id, 'UPLOAD_OTHER', big, 'image/png')).status,
    ).toBe(413)
  })

  it('returns 400 for a missing or invalid kind', async () => {
    const run = await ctx.createRun()
    const res = await upload(run.id, 'NOPE', await png(), 'image/png')

    expect(res.status).toBe(400)
    expect(ErrorResponse.parse(res.body).error.code).toBe('VALIDATION_FAILED')
  })

  describe('deleting', () => {
    it('removes an uploaded reference and its file', async () => {
      const run = await ctx.createRun()
      const asset = AssetDto.parse(
        (await upload(run.id, 'UPLOAD_LOGO', await png(), 'image/png')).body,
      )

      const res = await request(ctx.app).delete(`/api/assets/${asset.id}`)

      expect(res.status).toBe(204)
      expect(
        [...ctx.storage.objects.keys()].some((k) => k.includes(asset.id)),
      ).toBe(false)
      expect(
        (await request(ctx.app).get(`/api/assets/${asset.id}`)).status,
      ).toBe(404)
    })

    it('refuses once the run has started', async () => {
      const run = await ctx.createRun()
      const asset = AssetDto.parse(
        (await upload(run.id, 'UPLOAD_LOGO', await png(), 'image/png')).body,
      )
      await request(ctx.app).post(`/api/runs/${run.id}/start`)

      const res = await request(ctx.app).delete(`/api/assets/${asset.id}`)

      expect(res.status).toBe(409)
      expect(ErrorResponse.parse(res.body).error.code).toBe(
        'RUN_ALREADY_STARTED',
      )
      expect(
        (await request(ctx.app).get(`/api/assets/${asset.id}`)).status,
      ).toBe(200)
    })

    it('refuses new uploads once the run has started', async () => {
      const run = await ctx.createRun()
      await request(ctx.app).post(`/api/runs/${run.id}/start`)

      const res = await upload(run.id, 'UPLOAD_LOGO', await png(), 'image/png')

      expect(res.status).toBe(409)
    })

    it('returns 404 for an unknown asset', async () => {
      expect(
        (await request(ctx.app).delete(`/api/assets/${UNKNOWN_ID}`)).status,
      ).toBe(404)
    })
  })

  it('returns 404 for an unknown asset', async () => {
    expect(
      (await request(ctx.app).get(`/api/assets/${UNKNOWN_ID}`)).status,
    ).toBe(404)
  })

  it('returns 400 for a malformed id', async () => {
    expect((await request(ctx.app).get('/api/assets/not-a-uuid')).status).toBe(
      400,
    )
    expect(
      (await upload('not-a-uuid', 'UPLOAD_LOGO', await png(), 'image/png'))
        .status,
    ).toBe(400)
  })
})
