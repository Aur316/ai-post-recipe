import type { Db } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export class SourceRepo {
  constructor(private readonly db: Db) {}

  createMany(data: Array<Prisma.SourceCreateManyInput>) {
    return this.db.source.createMany({ data })
  }

  listByRun(runId: string) {
    return this.db.source.findMany({
      where: { runId },
      orderBy: { fetchedAt: 'asc' },
    })
  }
}
