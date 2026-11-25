import type { Brief } from '@ai-post-recipe/shared'

import { NotFoundError } from '../../lib/errors.js'
import type { AssetRepo } from '../../repositories/asset/asset.repo.js'
import type { RunRepo } from '../../repositories/run/run.repo.js'

export class RunService {
  constructor(
    private readonly runs: RunRepo,
    private readonly assets: AssetRepo,
  ) {}

  create(brief: Brief) {
    return this.runs.create({
      brandName: brief.brandName,
      instagram: brief.instagramUrl,
      language: brief.language,
      brief,
    })
  }

  list() {
    return this.runs.list()
  }

  async get(id: string) {
    const run = await this.runs.findById(id)
    if (!run) throw new NotFoundError('Run', id)
    return { run, assets: await this.assets.listByRun(id) }
  }
}
