import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createDb } from './db/prisma.js'
import { registerWorkers } from './jobs/phase-runner.js'
import { logger } from './lib/logger.js'
import { FakeLlmProvider } from './providers/llm/fake-llm.provider.js'
import { PgBossQueue } from './providers/queue/pg-boss.queue.js'
import { S3Storage } from './providers/storage/s3.storage.js'
import { phases } from './services/phases/index.js'

const env = loadEnv()

const db = createDb(env.DATABASE_URL)
const storage = new S3Storage({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
})

const queue = new PgBossQueue(env.DATABASE_URL, {
  retryLimit: 2,
  retryDelaySeconds: 5,
})
// The fake provider answers until OpenRouter is wired in M5.
const llm = new FakeLlmProvider()

await storage.ensureBucket()
await queue.start()
await registerWorkers({ db, queue, llm, phases })

createApp({ db, storage, queue }).listen(env.PORT, () => {
  logger.info(`api: http://localhost:${env.PORT}`)
})
