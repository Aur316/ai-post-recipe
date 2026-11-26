import type {
  JobQueue,
  QueueJob,
  RetryPolicy,
  SendOptions,
} from './job-queue.js'

interface Pending {
  queue: string
  data: object
  retryCount: number
}

/**
 * In-memory JobQueue for tests. Jobs wait until drain() runs them, so a test
 * decides when the "worker" acts; failed jobs are retried like pg-boss does.
 */
export class MemoryQueue implements JobQueue {
  private readonly handlers = new Map<
    string,
    (job: QueueJob<object>) => Promise<void>
  >()
  private pending: Array<Pending> = []

  constructor(
    private readonly retry: RetryPolicy = {
      retryLimit: 2,
      retryDelaySeconds: 0,
    },
  ) {}

  start() {
    return Promise.resolve()
  }

  stop() {
    return Promise.resolve()
  }

  send<T extends object>(queue: string, data: T, _options?: SendOptions) {
    this.pending.push({ queue, data, retryCount: 0 })
    return Promise.resolve()
  }

  work<T extends object>(
    queue: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ) {
    this.handlers.set(
      queue,
      handler as (job: QueueJob<object>) => Promise<void>,
    )
    return Promise.resolve()
  }

  get size() {
    return this.pending.length
  }

  /** Runs jobs, including the ones they send, until the queue is empty. */
  async drain() {
    while (this.pending.length) {
      const [next, ...rest] = this.pending
      this.pending = rest
      if (!next) break
      const handler = this.handlers.get(next.queue)
      if (!handler) throw new Error(`No worker for queue ${next.queue}`)
      try {
        await handler({
          data: next.data,
          retryCount: next.retryCount,
          retryLimit: this.retry.retryLimit,
        })
      } catch {
        if (next.retryCount < this.retry.retryLimit) {
          this.pending.push({ ...next, retryCount: next.retryCount + 1 })
        }
      }
    }
  }
}
