import type { HealthResponse } from '@ai-post-recipe/shared'
import express from 'express'

export const app = express()

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' } satisfies HealthResponse)
})
