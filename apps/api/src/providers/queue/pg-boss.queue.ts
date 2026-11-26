import { PgBoss } from 'pg-boss'

import type {
  JobQueue,
  QueueJob,
  RetryPolicy,
  SendOptions,
} from './job-queue.js'

/** JobQueue on pg-boss, in the pgboss schema of the app database. */
export class PgBossQueue implements JobQueue {
  private readonly boss: PgBoss
  private readonly created = new Set<string>()

  constructor(
    connectionString: string,
    private readonly retry: RetryPolicy,
  ) {
    this.boss = new PgBoss({ connectionString })
  }

  async start() {
    await this.boss.start()
  }

  /** Waits for running jobs to finish (up to `timeoutMs`), so none is cut off half way. */
  async stop(timeoutMs = 60_000) {
    await this.boss.stop({ graceful: true, timeout: timeoutMs })
  }

  async send<T extends object>(queue: string, data: T, options?: SendOptions) {
    await this.ensureQueue(queue)
    await this.boss.send(queue, data, {
      retryLimit: this.retry.retryLimit,
      retryDelay: this.retry.retryDelaySeconds,
      retryBackoff: true,
      expireInSeconds: this.retry.expireInSeconds ?? 300,
      db: options?.tx ? asPgBossDb(options.tx) : undefined,
    })
  }

  async work<T extends object>(
    queue: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ) {
    await this.ensureQueue(queue)
    // Poll every half second so a run moves to its next phase without a visible pause.
    await this.boss.work<T>(
      queue,
      { pollingIntervalSeconds: 0.5 },
      async ([job]) => {
        if (!job) return
        await handler({
          data: job.data,
          retryCount: job.retryCount,
          retryLimit: this.retry.retryLimit,
        })
      },
    )
  }

  private async ensureQueue(queue: string) {
    if (this.created.has(queue)) return
    await this.boss.createQueue(queue)
    this.created.add(queue)
  }
}

/** pg-boss does not export its database adapter type, so take it from send(). */
type PgBossDb = NonNullable<NonNullable<Parameters<PgBoss['send']>[2]>['db']>

/** Lets pg-boss run its insert inside a Prisma interactive transaction. */
function asPgBossDb(tx: NonNullable<SendOptions['tx']>): PgBossDb {
  return {
    executeSql: async (text: string, values: Array<unknown> = []) => ({
      rows: await tx.$queryRawUnsafe<Array<unknown>>(text, ...values),
    }),
  }
}
