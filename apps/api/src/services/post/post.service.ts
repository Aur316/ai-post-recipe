import type { PromptLibrary } from '@ai-post-recipe/prompts'
import { AnalysisOutput, Brief, PostFormat } from '@ai-post-recipe/shared'

import type { Db } from '../../db/prisma.js'
import { CostMeter, MeteredImages } from '../../jobs/cost-meter.js'
import { ConflictError, NotFoundError } from '../../lib/errors.js'
import type { ImageProvider } from '../../providers/image/image.provider.js'
import type { SlideRenderer } from '../../providers/renderer/slide-renderer.js'
import type { StorageProvider } from '../../providers/storage/storage.provider.js'
import { AssetRepo } from '../../repositories/asset/asset.repo.js'
import { PhaseRunRepo } from '../../repositories/phase-run/phase-run.repo.js'
import { PostRepo, toSlides } from '../../repositories/post/post.repo.js'
import { RunRepo } from '../../repositories/run/run.repo.js'
import { loadUploads, saveGeneratedAsset } from '../phases/images.js'
import { makeBackground, renderSlide } from '../visuals/slides.js'

export interface SlideDeps {
  images: ImageProvider
  renderer: SlideRenderer
  prompts: PromptLibrary
  costCapUsd: number
}

/** Changes a person makes to finished posts: their text, or one slide. */
export class PostService {
  constructor(
    private readonly db: Db,
    private readonly storage: StorageProvider,
    private readonly slides: SlideDeps,
  ) {}

  async updateText(
    runId: string,
    index: number,
    text: { caption: string; hashtags: Array<string> },
  ) {
    const post = await this.find(runId, index)
    if (post.caption === null) {
      throw new ConflictError(
        'POST_HAS_NO_TEXT',
        'The post text is not written yet',
      )
    }
    return new PostRepo(this.db).updateText(post.id, text)
  }

  /**
   * A new background (with the person's instruction) and a new PNG for one
   * slide; the other slides stay. Its cost is added to the visuals phase.
   */
  async regenerateSlide(
    runId: string,
    index: number,
    order: number,
    instruction?: string,
  ) {
    const post = await this.find(runId, index)
    const slide = toSlides(post.slides).find((s) => s.order === order)
    if (!slide?.assetId) {
      throw new ConflictError(
        'SLIDE_NOT_RENDERED',
        `Slide ${order} has no image yet`,
      )
    }

    const phaseRuns = new PhaseRunRepo(this.db)
    const latest = await phaseRuns.latestByRun(runId)
    if (latest.some((p) => p.status === 'PENDING' || p.status === 'RUNNING')) {
      throw new ConflictError('RUN_IN_PROGRESS', 'A phase is already running')
    }
    const visuals = latest.find((p) => p.phase === 'VISUALS')
    if (!visuals)
      throw new ConflictError('SLIDE_NOT_RENDERED', 'Visuals have not run')

    const run = await new RunRepo(this.db).findById(runId)
    if (!run) throw new NotFoundError('Run', runId)
    const analysis = latest.find((p) => p.phase === 'ANALYSIS')
    const meter = new CostMeter(
      await phaseRuns.totalCost(runId),
      this.slides.costCapUsd,
    )
    const assets = new AssetRepo(this.db)
    const tools = {
      images: new MeteredImages(this.slides.images, meter),
      renderer: this.slides.renderer,
      prompts: this.slides.prompts,
      uploads: await loadUploads(assets, this.storage, runId),
      saveAsset: async (
        kind: 'GENERATED_BACKGROUND' | 'RENDERED_SLIDE',
        data: Buffer,
        mime: string,
      ) =>
        (
          await saveGeneratedAsset(
            assets,
            this.storage,
            runId,
            kind,
            data,
            mime,
          )
        ).id,
    }
    const design = {
      brief: Brief.parse(run.brief),
      analysis: AnalysisOutput.safeParse(
        analysis?.editedOutput ?? analysis?.output,
      ).data,
      index,
      format: PostFormat.parse(post.format),
      goal: post.goal,
      concept: post.concept,
      product: post.product,
    }

    try {
      const background = await makeBackground(tools, design, instruction)
      const total = toSlides(post.slides).filter((s) => s.assetId).length
      const assetId = await renderSlide(tools, {
        post: design,
        text: slide.text,
        order,
        total: Math.max(total, 1),
        background: background.image,
      })
      return await new PostRepo(this.db).setSlideAsset(post.id, order, assetId)
    } finally {
      await phaseRuns.addUsage(visuals.id, meter.usage)
    }
  }

  private async find(runId: string, index: number) {
    const post = await new PostRepo(this.db).findByIndex(runId, index)
    if (!post) throw new NotFoundError('Post', `${runId}/${index}`)
    return post
  }
}
