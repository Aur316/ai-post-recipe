import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createDb } from './db/prisma.js'
import { logger } from './lib/logger.js'
import { S3Storage } from './providers/storage/s3.storage.js'

const env = loadEnv()

const db = createDb(env.DATABASE_URL)
const storage = new S3Storage({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
})

await storage.ensureBucket()

createApp({ db, storage }).listen(env.PORT, () => {
  logger.info(`api: http://localhost:${env.PORT}`)
})
