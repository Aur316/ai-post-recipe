import type { PlanOutput, PostCopy } from '@ai-post-recipe/shared'
import type { z } from 'zod'

import type { DbClient } from '../../db/prisma.js'

export class PostRepo {
  constructor(private readonly db: DbClient) {}

  /** The approved plan replaces the run's posts; their copy starts empty. */
  async replaceWithPlan(runId: string, plan: z.infer<typeof PlanOutput>) {
    await this.db.post.deleteMany({ where: { runId } })
    await this.db.post.createMany({
      data: plan.posts.map((p) => ({
        runId,
        index: p.index,
        format: p.format,
        goal: p.goal,
        concept: p.concept,
        rationale: p.rationale,
        product: p.product,
        hashtags: [],
        slides: [],
      })),
    })
  }

  /** Writes the copy onto the posts with the same index. */
  async saveCopy(runId: string, copy: Array<PostCopy>) {
    for (const post of copy) {
      await this.db.post.updateMany({
        where: { runId, index: post.index },
        data: {
          caption: post.caption,
          hashtags: post.hashtags,
          slides: post.slides,
        },
      })
    }
  }

  listByRun(runId: string) {
    return this.db.post.findMany({
      where: { runId },
      orderBy: { index: 'asc' },
    })
  }
}
