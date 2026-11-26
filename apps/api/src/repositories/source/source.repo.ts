import type { DbClient } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export class SourceRepo {
  constructor(private readonly db: DbClient) {}

  createMany(data: Array<Prisma.SourceCreateManyInput>) {
    return this.db.source.createMany({ data })
  }

  deleteByRun(runId: string) {
    return this.db.source.deleteMany({ where: { runId } })
  }

  listByRun(runId: string) {
    return this.db.source.findMany({
      where: { runId },
      orderBy: [{ fetchedAt: 'asc' }, { id: 'asc' }],
    })
  }
}
