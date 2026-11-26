import express from 'express'
import { randomUUID } from 'node:crypto'
import { pinoHttp } from 'pino-http'

import { AssetController } from './controllers/asset/asset.controller.js'
import { HealthController } from './controllers/health/health.controller.js'
import { PipelineController } from './controllers/pipeline/pipeline.controller.js'
import { RunController } from './controllers/run/run.controller.js'
import type { Db } from './db/prisma.js'
import { logger } from './lib/logger.js'
import { errorHandler } from './middleware/error-handler.js'
import { uploadSingleFile } from './middleware/upload.js'
import type { JobQueue } from './providers/queue/job-queue.js'
import type { StorageProvider } from './providers/storage/storage.provider.js'
import { AssetRepo } from './repositories/asset/asset.repo.js'
import { PhaseRunRepo } from './repositories/phase-run/phase-run.repo.js'
import { RunRepo } from './repositories/run/run.repo.js'
import { AssetService } from './services/asset/asset.service.js'
import { PipelineService } from './services/pipeline/pipeline.service.js'
import { RunService } from './services/run/run.service.js'

export interface AppDeps {
  db: Db
  storage: StorageProvider
  queue: JobQueue
}

export function createApp({ db, storage, queue }: AppDeps) {
  const runRepo = new RunRepo(db)
  const assetRepo = new AssetRepo(db)

  const runs = new RunController(
    new RunService(runRepo, assetRepo, new PhaseRunRepo(db)),
  )
  const pipeline = new PipelineController(new PipelineService(db, queue))
  const assets = new AssetController(
    new AssetService(runRepo, assetRepo, storage),
  )
  const health = new HealthController(db, storage)

  const app = express()
  app.disable('x-powered-by')
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id']?.toString() ?? randomUUID()
        res.setHeader('X-Request-Id', id)
        return id
      },
    }),
  )
  app.use(express.json())

  app.get('/api/health', health.check)
  app.post('/api/runs', runs.create)
  app.get('/api/runs', runs.list)
  app.get('/api/runs/:id', runs.get)
  app.post('/api/runs/:id/start', pipeline.start)
  app.post('/api/runs/:id/phases/:phase/approve', pipeline.approve)
  app.post('/api/runs/:id/phases/:phase/rerun', pipeline.rerun)
  app.post('/api/runs/:id/assets', uploadSingleFile, assets.upload)
  app.get('/api/assets/:id', assets.download)

  app.use(errorHandler)
  return app
}
