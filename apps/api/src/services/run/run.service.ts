import type { Brief, RunListQuery } from '@ai-post-recipe/shared'

import { ConflictError, NotFoundError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import type { StorageProvider } from '../../providers/storage/storage.provider.js'
import type { AssetRepo } from '../../repositories/asset/asset.repo.js'
import type { PhaseRunRepo } from '../../repositories/phase-run/phase-run.repo.js'
import type { PostRepo } from '../../repositories/post/post.repo.js'
import type { RunRepo } from '../../repositories/run/run.repo.js'
import type { SourceRepo } from '../../repositories/source/source.repo.js'

export class RunService {
  constructor(
    private readonly runs: RunRepo,
    private readonly assets: AssetRepo,
    private readonly phaseRuns: PhaseRunRepo,
    private readonly sources: SourceRepo,
    private readonly posts: PostRepo,
    private readonly storage: StorageProvider,
  ) {}

  create(brief: Brief) {
    return this.runs.create(briefColumns(brief))
  }

  /**
   * Deletes the run with everything that belongs to it: its phases, sources
   * and posts (cascade in the database) and every stored file. Refused while
   * a phase is queued or running, so no job is cut off half way.
   */
  async remove(id: string) {
    if (!(await this.runs.findById(id))) throw new NotFoundError('Run', id)
    const phases = await this.phaseRuns.latestByRun(id)
    if (phases.some((p) => p.status === 'PENDING' || p.status === 'RUNNING')) {
      throw new ConflictError(
        'RUN_IN_PROGRESS',
        'A phase is running; delete the run when it has finished',
      )
    }
    const files = await this.assets.listByRun(id)
    await this.runs.delete(id)
    // The rows are gone; a file that cannot be deleted is only wasted space.
    await Promise.all(
      files.map((file) =>
        this.storage.delete(file.storageKey).catch((error: unknown) => {
          logger.warn(
            { err: error, storageKey: file.storageKey },
            'Could not delete a stored file',
          )
        }),
      ),
    )
  }

  /** Replaces the brief while the run has not been started. */
  async update(id: string, brief: Brief) {
    if (await this.runs.updateIfNotStarted(id, briefColumns(brief))) {
      return this.get(id)
    }
    if (!(await this.runs.findById(id))) throw new NotFoundError('Run', id)
    throw new ConflictError(
      'RUN_ALREADY_STARTED',
      'The brief can only be edited before the run is started',
    )
  }

  async list(query: RunListQuery) {
    const { items, total } = await this.runs.list(query)
    const usage = await this.phaseRuns.usageOfRuns(items.map((r) => r.id))
    return {
      items: items.map((run) => ({
        run,
        usage: usage.get(run.id) ?? NO_USAGE,
      })),
      total,
      page: query.page,
      size: query.size,
      totalPages: Math.ceil(total / query.size),
    }
  }

  async get(id: string) {
    const run = await this.runs.findById(id)
    if (!run) throw new NotFoundError('Run', id)
    const [assets, phases, sources, posts] = await Promise.all([
      this.assets.listByRun(id),
      this.phaseRuns.latestByRun(id),
      this.sources.listByRun(id),
      this.posts.listByRun(id),
    ])
    const usageByPhase = await this.phaseRuns.usageByPhase(id)
    return {
      run,
      assets,
      phases,
      sources,
      posts,
      usageByPhase,
      usage: sumUsage(usageByPhase),
    }
  }
}

function briefColumns(brief: Brief) {
  return {
    brandName: brief.brandName,
    instagram: brief.instagramUrl,
    language: brief.language,
    brief,
  }
}

const NO_USAGE = { costUsd: 0, tokensIn: 0, tokensOut: 0 }

export const sumUsage = (
  rows: Array<{ costUsd: number; tokensIn: number; tokensOut: number }>,
) =>
  rows.reduce(
    (sum, r) => ({
      costUsd: sum.costUsd + r.costUsd,
      tokensIn: sum.tokensIn + r.tokensIn,
      tokensOut: sum.tokensOut + r.tokensOut,
    }),
    NO_USAGE,
  )
