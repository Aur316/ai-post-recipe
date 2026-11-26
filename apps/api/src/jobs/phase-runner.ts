import type { Db } from '../db/prisma.js'
import { logger } from '../lib/logger.js'
import type { LlmProvider } from '../providers/llm/llm.provider.js'
import type { JobQueue, QueueJob } from '../providers/queue/job-queue.js'
import type { PhaseRegistry } from '../services/phases/index.js'
import { PipelineService } from '../services/pipeline/pipeline.service.js'
import { PHASE_QUEUE, type PhaseJob } from './queues.js'

/**
 * Runs one phase per job: claim it, execute it, validate the output, and hand
 * the result to the pipeline. A failed attempt goes back to the queue until its
 * retries run out, then the phase is FAILED.
 */
export class PhaseRunner {
  constructor(
    private readonly pipeline: PipelineService,
    private readonly phases: PhaseRegistry,
    private readonly llm: LlmProvider,
  ) {}

  handle = async ({ data, retryCount, retryLimit }: QueueJob<PhaseJob>) => {
    const phaseRun = await this.pipeline.claim(data.phaseRunId, retryCount)
    if (!phaseRun) return

    const phase = this.phases[phaseRun.phase]
    try {
      const ctx = await this.pipeline.context(phaseRun)
      const result = await phase.execute({ ...ctx, llm: this.llm })
      const output = phase.outputSchema.parse(result.output)
      await this.pipeline.complete(phaseRun.id, { ...result, output })
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
      if (retryCount < retryLimit) {
        await this.pipeline.release(phaseRun.id, message)
        throw error
      }
      await this.pipeline.fail(phaseRun.id, message)
    }
  }
}

export interface WorkerDeps {
  db: Db
  queue: JobQueue
  llm: LlmProvider
  phases: PhaseRegistry
}

export async function registerWorkers({ db, queue, llm, phases }: WorkerDeps) {
  const runner = new PhaseRunner(new PipelineService(db, queue), phases, llm)
  await queue.work<PhaseJob>(PHASE_QUEUE, runner.handle)
}
