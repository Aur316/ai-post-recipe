import type { Db } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export class RunRepo {
  constructor(private readonly db: Db) {}

  create(data: Prisma.RunCreateInput) {
    return this.db.run.create({ data })
  }

  findById(id: string) {
    return this.db.run.findUnique({ where: { id } })
  }

  list() {
    return this.db.run.findMany({ orderBy: { createdAt: 'desc' } })
  }

  delete(id: string) {
    return this.db.run.delete({ where: { id } })
  }
}
