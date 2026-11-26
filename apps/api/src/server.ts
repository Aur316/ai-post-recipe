import { PromptLibrary } from '@ai-post-recipe/prompts'

import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createDb } from './db/prisma.js'
import { registerWorkers } from './jobs/phase-runner.js'
import { logger } from './lib/logger.js'
import { PlaywrightCapturer } from './providers/capture/playwright.capturer.js'
import { WebFetcher } from './providers/fetcher/web-fetcher.js'
import { FakeImageProvider } from './providers/image/fake-image.provider.js'
import type { ImageProvider } from './providers/image/image.provider.js'
import { OpenRouterImageProvider } from './providers/image/openrouter-image.provider.js'
import { FakeLlmProvider } from './providers/llm/fake-llm.provider.js'
import type { LlmProvider } from './providers/llm/llm.provider.js'
import { OpenRouterProvider } from './providers/llm/openrouter.provider.js'
import { PgBossQueue } from './providers/queue/pg-boss.queue.js'
import { PlaywrightRenderer } from './providers/renderer/playwright.renderer.js'
import { NoopSearchProvider } from './providers/search/search.provider.js'
import type { SearchProvider } from './providers/search/search.provider.js'
import { SerperProvider } from './providers/search/serper.provider.js'
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
  // The slowest phase (review with remade slides) takes about two minutes.
  expireInSeconds: 300,
})

const llm: LlmProvider = env.OPENROUTER_API_KEY
  ? new OpenRouterProvider({
      apiKey: env.OPENROUTER_API_KEY,
      timeoutMs: env.LLM_TIMEOUT_MS,
    })
  : new FakeLlmProvider()
if (llm.name === 'fake') {
  logger.warn('OPENROUTER_API_KEY is not set: phases use recorded fake answers')
}

const images: ImageProvider = env.OPENROUTER_API_KEY
  ? new OpenRouterImageProvider({
      apiKey: env.OPENROUTER_API_KEY,
      timeoutMs: env.LLM_TIMEOUT_MS,
    })
  : new FakeImageProvider()
const renderer = new PlaywrightRenderer()
const capturer = new PlaywrightCapturer()

const search: SearchProvider = env.SERPER_API_KEY
  ? new SerperProvider(env.SERPER_API_KEY)
  : new NoopSearchProvider()

const prompts = PromptLibrary.load(process.env)

await storage.ensureBucket()
await queue.start()
await registerWorkers({
  db,
  queue,
  phases,
  llm,
  prompts,
  search,
  fetcher: new WebFetcher(),
  storage,
  images,
  renderer,
  capturer,
  costCapUsd: env.MAX_COST_USD_PER_RUN,
})

createApp({
  db,
  storage,
  queue,
  slides: { images, renderer, prompts, costCapUsd: env.MAX_COST_USD_PER_RUN },
  providers: { llm: llm.name, search: search.name },
}).listen(env.PORT, () => {
  logger.info(`api: http://localhost:${env.PORT}`)
})

/**
 * Stop the queue first and let a running phase finish; exiting at once would
 * leave its job active until it expires, and the run would stall meanwhile.
 * Then close the browsers that render slides and take screenshots.
 */
async function shutdown() {
  logger.info('Stopping: waiting for running phases to finish')
  await queue.stop().catch((error: unknown) => {
    logger.warn({ err: error }, 'The queue did not stop cleanly')
  })
  await Promise.allSettled([renderer.close(), capturer.close()])
  process.exit(0)
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void shutdown())
}
