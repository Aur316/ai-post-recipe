import type { PromptLibrary } from '@ai-post-recipe/prompts'

import type { Db } from '../db/prisma.js'
import { logger } from '../lib/logger.js'
import { PermanentError } from '../lib/phase-errors.js'
import type { PageFetcher } from '../providers/fetcher/web-fetcher.js'
import type { LlmProvider } from '../providers/llm/llm.provider.js'
import type { JobQueue, QueueJob } from '../providers/queue/job-queue.js'
import type { SearchProvider } from '../providers/search/search.provider.js'
import type { StorageProvider } from '../providers/storage/storage.provider.js'
import { AssetRepo } from '../repositories/asset/asset.repo.js'
import { loadReferenceImages } from '../services/phases/images.js'
import type { PhaseRegistry } from '../services/phases/index.js'
import { PipelineService } from '../services/pipeline/pipeline.service.js'
import { MeteredLlm } from './metered-llm.js'
import { PHASE_QUEUE, type PhaseJob } from './queues.js'

export interface RunnerTools {
  llm: LlmProvider
  prompts: PromptLibrary
  search: SearchProvider
  fetcher: PageFetcher
  storage: StorageProvider
  /** MAX_COST_USD_PER_RUN: no LLM call starts once a run has spent this much. */
  costCapUsd: number
}

/**
 * Runs one phase per job: claim it, execute it, validate the output, and hand
 * the result to the pipeline. A failed attempt goes back to the queue until its
 * retries run out, then the phase is FAILED. Errors no retry can fix (a rejected
 * key, the cost cap) fail the phase at once. Every attempt's LLM usage is saved,
 * successful or not, so the run's cost is complete.
 */
export class PhaseRunner {
  constructor(
    private readonly db: Db,
    private readonly pipeline: PipelineService,
    private readonly phases: PhaseRegistry,
    private readonly tools: RunnerTools,
  ) {}

  handle = async ({ data, retryCount, retryLimit }: QueueJob<PhaseJob>) => {
    const phaseRun = await this.pipeline.claim(data.phaseRunId, retryCount)
    if (!phaseRun) return

    const { llm, prompts, search, fetcher, storage, costCapUsd } = this.tools
    const metered = new MeteredLlm(
      llm,
      await this.pipeline.costOfRun(phaseRun.runId),
      costCapUsd,
    )
    const phase = this.phases[phaseRun.phase]
    try {
      const ctx = await this.pipeline.context(phaseRun)
      const result = await phase.execute({
        ...ctx,
        llm: metered,
        prompts,
        search,
        fetcher,
        loadImages: () =>
          loadReferenceImages(new AssetRepo(this.db), storage, phaseRun.runId),
      })
      const output = phase.outputSchema.parse(result.output)
      await this.pipeline.complete(phaseRun.id, {
        ...result,
        output,
        usage: result.usage ? metered.usage : undefined,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(
        {
          phaseRunId: phaseRun.id,
          phase: phaseRun.phase,
          retryCount,
          err: error,
        },
        'Phase attempt failed',
      )
      const permanent = error instanceof PermanentError
      if (!permanent && retryCount < retryLimit) {
        await this.pipeline.release(phaseRun.id, message, metered.usage)
        throw error
      }
      await this.pipeline.fail(phaseRun.id, message, metered.usage)
    }
  }
}

export interface WorkerDeps extends RunnerTools {
  db: Db
  queue: JobQueue
  phases: PhaseRegistry
}

export async function registerWorkers({
  db,
  queue,
  phases,
  ...tools
}: WorkerDeps) {
  const runner = new PhaseRunner(
    db,
    new PipelineService(db, queue),
    phases,
    tools,
  )
  await queue.work<PhaseJob>(PHASE_QUEUE, runner.handle)
}
