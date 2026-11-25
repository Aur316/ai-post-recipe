import express from 'express'
import { randomUUID } from 'node:crypto'
import { pinoHttp } from 'pino-http'

import { AssetController } from './controllers/asset.controller.js'
import { HealthController } from './controllers/health.controller.js'
import type { Db } from './db/prisma.js'
import { logger } from './lib/logger.js'
import { errorHandler } from './middleware/error-handler.js'
import { uploadSingleFile } from './middleware/upload.js'
import type { StorageProvider } from './providers/storage/storage.provider.js'
import { AssetRepo } from './repositories/asset.repo.js'
import { RunRepo } from './repositories/run.repo.js'
import { AssetService } from './services/asset.service.js'

export interface AppDeps {
  db: Db
  storage: StorageProvider
}

export function createApp({ db, storage }: AppDeps) {
  const assets = new AssetController(
    new AssetService(new RunRepo(db), new AssetRepo(db), storage),
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
  app.post('/api/runs/:id/assets', uploadSingleFile, assets.upload)
  app.get('/api/assets/:id', assets.download)

  app.use(errorHandler)
  return app
}
