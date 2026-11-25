import { HealthResponse } from '@ai-post-recipe/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createTestContext } from './test/context.js'

describe('GET /api/health', () => {
  const ctx = createTestContext()

  it('reports database and storage as healthy', async () => {
    const res = await request(ctx.app).get('/api/health')

    expect(res.status).toBe(200)
    expect(HealthResponse.parse(res.body)).toEqual({
      status: 'ok',
      checks: { database: true, storage: true },
    })
  })

  it('reports degraded with 503 when storage is down', async () => {
    ctx.storage.ping = () => Promise.resolve(false)
    const res = await request(ctx.app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({
      status: 'degraded',
      checks: { database: true, storage: false },
    })
  })
})
