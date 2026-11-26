import type { Prisma } from '../../generated/prisma/client.js'

export interface QueueJob<T> {
  data: T
  /** 0 on the first delivery, then 1, 2, … for each retry. */
  retryCount: number
  retryLimit: number
}

export interface SendOptions {
  /** Commit the job together with the caller's database transaction. */
  tx?: Prisma.TransactionClient
}

/**
 * The only way the app talks to a job queue. PgBossQueue implements it on
 * Postgres; a BullMQ + Redis implementation could replace it without changing
 * any caller (see ADR 0002, "Scaling path").
 */
export interface JobQueue {
  start(): Promise<void>
  stop(): Promise<void>
  send<T extends object>(
    queue: string,
    data: T,
    options?: SendOptions,
  ): Promise<void>
  work<T extends object>(
    queue: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void>
}

export interface RetryPolicy {
  retryLimit: number
  retryDelaySeconds: number
}
