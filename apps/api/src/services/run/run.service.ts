import type { Brief, ListQuery } from '@ai-post-recipe/shared'

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
    return { run, assets: await this.assets.listByRun(id) }
  }
}
