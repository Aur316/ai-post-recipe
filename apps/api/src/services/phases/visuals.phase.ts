import { type RenderedSlide, VisualsOutput } from '@ai-post-recipe/shared'

import { NO_USAGE, addUsage } from '../../providers/llm/llm.provider.js'
import { makeBackground, renderSlide } from '../visuals/slides.js'
import type { Phase } from './phase.js'

/**
 * One AI background per post, then every slide rendered from the template
 * with the real logo, product photo and text. A single-image post uses only
 * its first slide text.
 */
export const visualsPhase: Phase<'VISUALS'> = {
  key: 'VISUALS',
  outputSchema: VisualsOutput,
  execute: async (ctx) => {
    const plan = ctx.outputs.PLAN
    const copy = ctx.outputs.COPY
    if (!plan || !copy)
      throw new Error('Visuals need the plan and the post text')

    const tools = {
      images: ctx.images,
      renderer: ctx.renderer,
      prompts: ctx.prompts,
      uploads: await ctx.loadUploads(),
      saveAsset: (...args: Parameters<typeof ctx.saveAsset>) =>
        ctx.saveAsset(...args),
    }
    const slides: Array<RenderedSlide> = []
    let usage = NO_USAGE
    let model: string | undefined
    let promptId: string | undefined

    for (const planned of plan.posts) {
      const text = copy.posts.find((p) => p.index === planned.index)
      if (!text) continue
      const post = {
        brief: ctx.brief,
        analysis: ctx.outputs.ANALYSIS,
        index: planned.index,
        format: planned.format,
        goal: planned.goal,
        concept: planned.concept,
        product: planned.product,
      }
      const background = await makeBackground(tools, post)
      usage = addUsage(usage, background.image.usage)
      model = background.image.model
      promptId = background.promptId

      const texts =
        planned.format === 'IMAGE' ? text.slides.slice(0, 1) : text.slides
      for (const [i, slide] of texts.entries()) {
        const assetId = await renderSlide(tools, {
          post,
          text: slide.text,
          order: i + 1,
          total: texts.length,
          background: background.image,
        })
        slides.push({
          postIndex: planned.index,
          order: i + 1,
          assetId,
          backgroundAssetId: background.assetId,
        })
      }
    }
    return { output: { slides }, promptId, model, usage }
  },
}
