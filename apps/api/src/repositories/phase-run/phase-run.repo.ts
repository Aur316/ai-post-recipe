import type { DbClient } from '../../db/prisma.js'
import type {
  PhaseKey,
  PhaseStatus,
  Prisma,
} from '../../generated/prisma/client.js'

export class PhaseRunRepo {
  constructor(private readonly db: DbClient) {}

  create(data: Prisma.PhaseRunUncheckedCreateInput) {
    return this.db.phaseRun.create({ data })
  }

  findById(id: string) {
    return this.db.phaseRun.findUnique({ where: { id } })
  }

  listByRun(runId: string) {
    return this.db.phaseRun.findMany({
      where: { runId },
      orderBy: [{ phase: 'asc' }, { attempt: 'asc' }],
    })
  }

  /** The newest attempt of every phase that has started, in phase order. */
  latestByRun(runId: string) {
    return this.db.phaseRun.findMany({
      where: { runId },
      distinct: ['phase'],
      orderBy: [{ phase: 'asc' }, { attempt: 'desc' }],
    })
  }

  async nextAttempt(runId: string, phase: PhaseKey) {
    const last = await this.db.phaseRun.findFirst({
      where: { runId, phase },
      orderBy: { attempt: 'desc' },
      select: { attempt: true },
    })
    return (last?.attempt ?? 0) + 1
  }

  /**
   * Moves a phase run to RUNNING only if it is in one of the given states.
   * Returns false when another worker or an earlier delivery already took it.
   */
  async claim(id: string, from: Array<PhaseStatus>) {
    const { count } = await this.db.phaseRun.updateMany({
      where: { id, status: { in: from } },
      data: { status: 'RUNNING', startedAt: new Date(), error: null },
    })
    return count === 1
  }

  update(id: string, data: Prisma.PhaseRunUpdateInput) {
    return this.db.phaseRun.update({ where: { id }, data })
  }

  markStale(ids: Array<string>) {
    return this.db.phaseRun.updateMany({
      where: { id: { in: ids } },
      data: { status: 'STALE' },
    })
  }
}
