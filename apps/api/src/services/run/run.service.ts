import type { Brief, ListQuery } from '@ai-post-recipe/shared'

import { ConflictError, NotFoundError } from '../../lib/errors.js'
import type { AssetRepo } from '../../repositories/asset/asset.repo.js'
import type { PhaseRunRepo } from '../../repositories/phase-run/phase-run.repo.js'
import type { RunRepo } from '../../repositories/run/run.repo.js'
import type { SourceRepo } from '../../repositories/source/source.repo.js'

export class RunService {
  constructor(
    private readonly runs: RunRepo,
    private readonly assets: AssetRepo,
    private readonly phaseRuns: PhaseRunRepo,
    private readonly sources: SourceRepo,
  ) {}

  create(brief: Brief) {
    return this.runs.create(briefColumns(brief))
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

  async list(query: ListQuery) {
    const { items, total } = await this.runs.list(query)
    return {
      items,
      total,
      page: query.page,
      size: query.size,
      totalPages: Math.ceil(total / query.size),
    }
  }

  async get(id: string) {
    const run = await this.runs.findById(id)
    if (!run) throw new NotFoundError('Run', id)
    const [assets, phases, sources] = await Promise.all([
      this.assets.listByRun(id),
      this.phaseRuns.latestByRun(id),
      this.sources.listByRun(id),
    ])
    return { run, assets, phases, sources }
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
