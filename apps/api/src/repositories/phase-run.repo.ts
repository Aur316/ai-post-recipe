import type { Db } from '../db/prisma.js'
import type { Prisma } from '../generated/prisma/client.js'

export class PhaseRunRepo {
  constructor(private readonly db: Db) {}

  create(data: Prisma.PhaseRunUncheckedCreateInput) {
    return this.db.phaseRun.create({ data })
  }

  listByRun(runId: string) {
    return this.db.phaseRun.findMany({
      where: { runId },
      orderBy: [{ phase: 'asc' }, { attempt: 'asc' }],
    })
  }

  update(id: string, data: Prisma.PhaseRunUpdateInput) {
    return this.db.phaseRun.update({ where: { id }, data })
  }
}
