import {
  APPROVAL_PHASES,
  Brief,
  CopyOutput,
  PHASE_ORDER,
  PHASE_OUTPUT_SCHEMAS,
  type PhaseKey,
  type PhaseOutputs,
  type PhaseStatus,
  PlanOutput,
  ResearchOutput,
} from '@ai-post-recipe/shared'

import type { Db, DbClient } from '../../db/prisma.js'
import type { PhaseRun, Prisma } from '../../generated/prisma/client.js'
import { PHASE_QUEUE, type PhaseJob } from '../../jobs/queues.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors.js'
import type { LlmUsage } from '../../providers/llm/llm.provider.js'
import type { JobQueue } from '../../providers/queue/job-queue.js'
import { PhaseRunRepo } from '../../repositories/phase-run/phase-run.repo.js'
import { PostRepo } from '../../repositories/post/post.repo.js'
import { RunRepo } from '../../repositories/run/run.repo.js'
import { SourceRepo } from '../../repositories/source/source.repo.js'
import { deriveRunStatus, nextPhaseToRun } from './run-status.js'

const ACTIVE: ReadonlyArray<PhaseStatus> = ['PENDING', 'RUNNING']
const FINISHED: ReadonlyArray<PhaseStatus> = ['DONE', 'APPROVED']
const RERUNNABLE: ReadonlyArray<PhaseStatus> = [
  'DONE',
  'APPROVED',
  'AWAITING_APPROVAL',
  'FAILED',
  'STALE',
]

export interface PhaseCompletion {
  output: unknown
  promptId?: string
  model?: string
  usage?: LlmUsage
}

/**
 * The run's state machine: starting, approving and re-running phases, and the
 * transitions the phase runner reports. Every status change and the job it
 * queues are committed in one transaction.
 */
export class PipelineService {
  constructor(
    private readonly db: Db,
    private readonly queue: JobQueue,
  ) {}

  /** Queues the first phase that has not finished yet. */
  start(runId: string) {
    return this.db.$transaction(async (tx) => {
      const latest = await this.latest(tx, runId)
      this.assertIdle(latest)
      if (latest.some((p) => p.status === 'AWAITING_APPROVAL')) {
        throw new ConflictError(
          'AWAITING_APPROVAL',
          'A phase is waiting for approval',
        )
      }
      const next = nextPhaseToRun(latest)
      if (!next) throw new ConflictError('RUN_COMPLETED', 'Every phase is done')
      await this.enqueue(tx, runId, next)
      await this.refreshStatus(tx, runId)
    })
  }

  /** Accepts a waiting phase, optionally with a person's edits, and queues the next one. */
  approve(runId: string, phase: PhaseKey, editedOutput?: unknown) {
    return this.db.$transaction(async (tx) => {
      const current = (await this.latest(tx, runId)).find(
        (p) => p.phase === phase,
      )
      if (current?.status !== 'AWAITING_APPROVAL') {
        throw new ConflictError(
          'PHASE_NOT_AWAITING_APPROVAL',
          `Phase ${phase} is ${current?.status ?? 'not started'}`,
        )
      }

      let edited: Prisma.InputJsonValue | undefined
      if (editedOutput !== undefined) {
        const parsed = PHASE_OUTPUT_SCHEMAS[phase].safeParse(editedOutput)
        if (!parsed.success) {
          throw new ValidationError(
            'The edited output does not match the phase schema',
            parsed.error.issues,
          )
        }
        edited = parsed.data
      }

      await new PhaseRunRepo(tx).update(current.id, {
        status: 'APPROVED',
        editedOutput: edited,
      })
      if (phase === 'PLAN') {
        // The approved plan, with the person's edits, becomes the three posts.
        await new PostRepo(tx).replaceWithPlan(
          runId,
          PlanOutput.parse(edited ?? current.output),
        )
      }
      const next = PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1]
      if (next) await this.enqueue(tx, runId, next)
      await this.refreshStatus(tx, runId)
    })
  }

  /** Runs a phase again; every later phase becomes stale. */
  rerun(runId: string, phase: PhaseKey) {
    return this.db.$transaction(async (tx) => {
      const latest = await this.latest(tx, runId)
      this.assertIdle(latest)
      const current = latest.find((p) => p.phase === phase)
      if (!current || !RERUNNABLE.includes(current.status)) {
        throw new ConflictError(
          'PHASE_NOT_RERUNNABLE',
          `Phase ${phase} is ${current?.status ?? 'not started'}`,
        )
      }

      const index = PHASE_ORDER.indexOf(phase)
      const stale = latest.filter(
        (p) =>
          p.status !== 'STALE' &&
          (PHASE_ORDER.indexOf(p.phase) > index ||
            (p.phase === phase && p.status === 'AWAITING_APPROVAL')),
      )
      await new PhaseRunRepo(tx).markStale(stale.map((p) => p.id))
      await this.enqueue(tx, runId, phase)
      await this.refreshStatus(tx, runId)
    })
  }

  // ── Called by the phase runner ────────────────────────────────────────────

  /**
   * Takes a queued phase run. A redelivered job (retryCount > 0) may also take
   * a RUNNING one, because its previous worker stopped mid-way.
   */
  async claim(phaseRunId: string, retryCount: number) {
    const from: Array<PhaseStatus> =
      retryCount > 0 ? ['PENDING', 'RUNNING'] : ['PENDING']
    const phases = new PhaseRunRepo(this.db)
    if (!(await phases.claim(phaseRunId, from))) return null
    return phases.findById(phaseRunId)
  }

  /** The brief and the finished outputs of the phases before this one. */
  async context(phaseRun: PhaseRun) {
    const run = await new RunRepo(this.db).findById(phaseRun.runId)
    if (!run) throw new NotFoundError('Run', phaseRun.runId)
    const latest = await this.latest(this.db, phaseRun.runId)
    const outputs: Partial<PhaseOutputs> = {}
    for (const p of latest) {
      if (FINISHED.includes(p.status)) {
        Object.assign(outputs, { [p.phase]: p.editedOutput ?? p.output })
      }
    }
    return { runId: run.id, brief: Brief.parse(run.brief), outputs }
  }

  complete(phaseRunId: string, result: PhaseCompletion) {
    return this.db.$transaction(async (tx) => {
      const phases = new PhaseRunRepo(tx)
      const done = await phases.update(phaseRunId, {
        status: APPROVAL_PHASES.includes(
          phaseOf(await phases.findById(phaseRunId)),
        )
          ? 'AWAITING_APPROVAL'
          : 'DONE',
        output: result.output as Prisma.InputJsonValue,
        promptId: result.promptId,
        model: result.model,
        ...usageColumns(result.usage),
        finishedAt: new Date(),
      })
      if (done.phase === 'RESEARCH') {
        await this.saveSources(tx, done.runId, result.output)
      }
      if (done.phase === 'COPY') {
        await new PostRepo(tx).saveCopy(
          done.runId,
          CopyOutput.parse(result.output).posts,
        )
      }
      if (done.status === 'DONE') {
        const next = PHASE_ORDER[PHASE_ORDER.indexOf(done.phase) + 1]
        if (next) await this.enqueue(tx, done.runId, next)
      }
      await this.refreshStatus(tx, done.runId)
    })
  }

  /** Puts the phase back in the queue's hands for another try. */
  async release(phaseRunId: string, error: string, usage?: LlmUsage) {
    await new PhaseRunRepo(this.db).update(phaseRunId, {
      status: 'PENDING',
      error,
      ...usageColumns(usage),
    })
  }

  fail(phaseRunId: string, error: string, usage?: LlmUsage) {
    return this.db.$transaction(async (tx) => {
      const failed = await new PhaseRunRepo(tx).update(phaseRunId, {
        status: 'FAILED',
        error,
        finishedAt: new Date(),
        ...usageColumns(usage),
      })
      await this.refreshStatus(tx, failed.runId)
    })
  }

  /** Everything the run has spent on LLM calls, over all attempts. */
  costOfRun(runId: string) {
    return new PhaseRunRepo(this.db).totalCost(runId)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** The latest research replaces the run's sources. */
  private async saveSources(
    tx: Prisma.TransactionClient,
    runId: string,
    output: unknown,
  ) {
    const { sources } = ResearchOutput.parse(output)
    const repo = new SourceRepo(tx)
    await repo.deleteByRun(runId)
    await repo.createMany(
      sources.map((s) => ({
        runId,
        url: s.url,
        title: s.title,
        excerpt: s.excerpt,
        reachable: s.reachable,
        error: s.error,
        origin: s.origin,
        fetchedAt: new Date(s.fetchedAt),
      })),
    )
  }

  private latest(client: DbClient, runId: string) {
    return new PhaseRunRepo(client).latestByRun(runId)
  }

  private assertIdle(latest: Array<PhaseRun>) {
    if (latest.some((p) => ACTIVE.includes(p.status))) {
      throw new ConflictError('RUN_IN_PROGRESS', 'A phase is already running')
    }
  }

  private async enqueue(
    tx: Prisma.TransactionClient,
    runId: string,
    phase: PhaseKey,
  ) {
    const phases = new PhaseRunRepo(tx)
    const phaseRun = await phases.create({
      runId,
      phase,
      attempt: await phases.nextAttempt(runId, phase),
    })
    const job: PhaseJob = { phaseRunId: phaseRun.id }
    await this.queue.send(PHASE_QUEUE, job, { tx })
  }

  private async refreshStatus(tx: Prisma.TransactionClient, runId: string) {
    const latest = await this.latest(tx, runId)
    await new RunRepo(tx).setStatus(runId, deriveRunStatus(latest))
  }
}

/** Usage columns; a phase without LLM calls leaves them empty. */
function usageColumns(usage?: LlmUsage) {
  if (!usage) return {}
  return {
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    costUsd: usage.costUsd,
  }
}

function phaseOf(phaseRun: PhaseRun | null): PhaseKey {
  if (!phaseRun) throw new Error('Phase run disappeared while completing')
  return phaseRun.phase
}
