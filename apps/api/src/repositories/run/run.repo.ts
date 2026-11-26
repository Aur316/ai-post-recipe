import type { ListQuery } from '@ai-post-recipe/shared'

import type { DbClient } from '../../db/prisma.js'
import type { RunStatus } from '../../generated/prisma/client.js'
import type { Prisma } from '../../generated/prisma/client.js'

export class RunRepo {
  constructor(private readonly db: DbClient) {}

  create(data: Prisma.RunCreateInput) {
    return this.db.run.create({ data })
  }

  findById(id: string) {
    return this.db.run.findUnique({ where: { id } })
  }

  /** One page of runs, newest first, with the total count. */
  async list({ page, size }: ListQuery) {
    const [items, total] = await Promise.all([
      this.db.run.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * size,
        take: size,
      }),
      this.db.run.count(),
    ])
    return { items, total }
  }

  setStatus(id: string, status: RunStatus) {
    return this.db.run.update({ where: { id }, data: { status } })
  }

  delete(id: string) {
    return this.db.run.delete({ where: { id } })
  }
}
