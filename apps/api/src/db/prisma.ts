import { PrismaPg } from '@prisma/adapter-pg'

import { type Prisma, PrismaClient } from '../generated/prisma/client.js'

export type Db = PrismaClient

/** The client or an open transaction; repositories accept either. */
export type DbClient = PrismaClient | Prisma.TransactionClient

export function createDb(databaseUrl: string): Db {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  })
}
