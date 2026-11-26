import type { RunListQuery } from '@ai-post-recipe/shared'

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

  async list({ page, size, search }: RunListQuery) {
    const where: Prisma.RunWhereInput = search
      ? {
          OR: [
            { brandName: { contains: search, mode: 'insensitive' } },
            { instagram: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}
    const [items, total] = await Promise.all([
      this.db.run.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * size,
        take: size,
      }),
      this.db.run.count({ where }),
    ])
    return { items, total }
  }

  async updateIfNotStarted(
    id: string,
    data: Prisma.RunUpdateManyMutationInput,
  ) {
    const { count } = await this.db.run.updateMany({
      where: { id, phases: { none: {} } },
      data,
    })
    return count === 1
  }

  async hasStarted(id: string) {
    return (
      (await this.db.run.count({ where: { id, phases: { some: {} } } })) > 0
    )
  }

  setStatus(id: string, status: RunStatus) {
    return this.db.run.update({ where: { id }, data: { status } })
  }

  delete(id: string) {
    return this.db.run.delete({ where: { id } })
  }
}
