import type { Db } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export class AssetRepo {
  constructor(private readonly db: Db) {}

  create(data: Prisma.AssetUncheckedCreateInput) {
    return this.db.asset.create({ data })
  }

  findById(id: string) {
    return this.db.asset.findUnique({ where: { id } })
  }

  listByRun(runId: string) {
    return this.db.asset.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    })
  }
}
