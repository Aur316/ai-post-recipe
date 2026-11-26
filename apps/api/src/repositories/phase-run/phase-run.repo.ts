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

  async addUsage(
    id: string,
    usage: { tokensIn: number; tokensOut: number; costUsd: number },
  ) {
    if (!usage.costUsd && !usage.tokensIn && !usage.tokensOut) return
    await this.db.phaseRun.update({
      where: { id },
      data: {
        tokensIn: { increment: usage.tokensIn },
        tokensOut: { increment: usage.tokensOut },
        costUsd: { increment: usage.costUsd },
      },
    })
  }

  async usageByPhase(runId: string) {
    const rows = await this.db.phaseRun.groupBy({
      by: ['phase'],
      where: { runId },
      _count: { _all: true },
      _sum: { costUsd: true, tokensIn: true, tokensOut: true },
      orderBy: { phase: 'asc' },
    })
    return rows.map((r) => ({
      phase: r.phase,
      attempts: r._count._all,
      costUsd: Number(r._sum.costUsd ?? 0),
      tokensIn: r._sum.tokensIn ?? 0,
      tokensOut: r._sum.tokensOut ?? 0,
    }))
  }

  async usageOfRuns(runIds: Array<string>) {
    const rows = await this.db.phaseRun.groupBy({
      by: ['runId'],
      where: { runId: { in: runIds } },
      _sum: { costUsd: true, tokensIn: true, tokensOut: true },
    })
    return new Map(
      rows.map((r) => [
        r.runId,
        {
          costUsd: Number(r._sum.costUsd ?? 0),
          tokensIn: r._sum.tokensIn ?? 0,
          tokensOut: r._sum.tokensOut ?? 0,
        },
      ]),
    )
  }

  async totalCost(runId: string) {
    const { _sum } = await this.db.phaseRun.aggregate({
      where: { runId },
      _sum: { costUsd: true },
    })
    return Number(_sum.costUsd ?? 0)
  }

  markStale(ids: Array<string>) {
    return this.db.phaseRun.updateMany({
      where: { id: { in: ids } },
      data: { status: 'STALE' },
    })
  }
}
