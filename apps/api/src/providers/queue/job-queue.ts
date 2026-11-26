import type { Prisma } from '../../generated/prisma/client.js'

export interface QueueJob<T> {
  data: T
  retryCount: number
  retryLimit: number
}

export interface SendOptions {
  tx?: Prisma.TransactionClient
}

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
  expireInSeconds?: number
}
