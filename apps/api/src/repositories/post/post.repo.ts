import type {
  PlanOutput,
  PostCopy,
  RenderedSlide,
} from '@ai-post-recipe/shared'
import type { z } from 'zod'

import type { DbClient } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

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

  /** Puts each rendered PNG on its slide; the text stays as written. */
  async saveSlides(runId: string, rendered: Array<RenderedSlide>) {
    const posts = await this.listByRun(runId)
    for (const post of posts) {
      const slides = toSlides(post.slides).map((slide) => ({
        ...slide,
        assetId:
          rendered.find(
            (r) => r.postIndex === post.index && r.order === slide.order,
          )?.assetId ?? null,
      }))
      await this.db.post.update({
        where: { id: post.id },
        data: { slides: slides },
      })
    }
  }

  /** Puts slides that were made again (by the review) on their posts. */
  async replaceSlides(runId: string, slides: Array<RenderedSlide>) {
    for (const slide of slides) {
      const post = await this.findByIndex(runId, slide.postIndex)
      if (post) await this.setSlideAsset(post.id, slide.order, slide.assetId)
    }
  }

  /** Replaces the PNG of one slide, e.g. after regenerating it. */
  async setSlideAsset(postId: string, order: number, assetId: string) {
    const post = await this.db.post.findUniqueOrThrow({ where: { id: postId } })
    const slides = toSlides(post.slides).map((s) =>
      s.order === order ? { ...s, assetId } : s,
    )
    return this.db.post.update({
      where: { id: postId },
      data: { slides: slides as unknown as Prisma.InputJsonArray },
    })
  }

  updateText(
    postId: string,
    data: { caption: string; hashtags: Array<string> },
  ) {
    return this.db.post.update({ where: { id: postId }, data })
  }

  findByIndex(runId: string, index: number) {
    return this.db.post.findUnique({ where: { runId_index: { runId, index } } })
  }

  listByRun(runId: string) {
    return this.db.post.findMany({
      where: { runId },
      orderBy: { index: 'asc' },
    })
  }
}

export interface StoredSlide {
  order: number
  text: string
  assetId: string | null
}

/** Slides as stored in the JSON column; anything malformed counts as none. */
export const toSlides = (value: unknown): Array<StoredSlide> =>
  Array.isArray(value)
    ? value.flatMap((v: unknown) => {
        if (!v || typeof v !== 'object') return []
        const s = v as Record<string, unknown>
        if (typeof s.order !== 'number' || typeof s.text !== 'string') return []
        return [
          {
            order: s.order,
            text: s.text,
            assetId: typeof s.assetId === 'string' ? s.assetId : null,
          },
        ]
      })
    : []
