import type { DbClient } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export class AssetRepo {
  constructor(private readonly db: DbClient) {}

  create(data: Prisma.AssetUncheckedCreateInput) {
    return this.db.asset.create({ data })
  }

  findById(id: string) {
    return this.db.asset.findUnique({ where: { id } })
  }

  async deleteIfRunNotStarted(id: string) {
    const { count } = await this.db.asset.deleteMany({
      where: { id, run: { phases: { none: {} } } },
    })
    return count === 1
  }

  listByRun(runId: string) {
    return this.db.asset.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    })
  }
}
