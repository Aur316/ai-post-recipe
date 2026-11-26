import {
  type PostFormat,
  type RenderedSlide,
  ReviewDraft,
  ReviewOutput,
  type SlideCheck,
} from '@ai-post-recipe/shared'
import sharp from 'sharp'

import {
  type LlmUsage,
  NO_USAGE,
  addUsage,
} from '../../providers/llm/llm.provider.js'
import { ruleIssues } from '../review/slide-check.js'
import { makeBackground, renderSlide } from '../visuals/slides.js'
import { type Phase, type PhaseContext, runPrompt } from './phase.js'
import { websiteShots } from './visuals.phase.js'

export const MAX_REGENERATIONS = 1

interface SlideUnderReview {
  postIndex: number
  order: number
  total: number
  format: PostFormat
  text: string
  assetId: string | null
}

const preview = async (data: Buffer) =>
  sharp(data).resize({ width: 540 }).jpeg({ quality: 80 }).toBuffer()

async function check(ctx: PhaseContext, slides: Array<SlideUnderReview>) {
  const images = await Promise.all(
    slides.map(async (s, i) => ({
      label: `Image ${i + 1}: post ${s.postIndex}, slide ${s.order}`,
      mimeType: 'image/jpeg',
      data: await preview((await ctx.readAsset(s.assetId ?? '')).data),
    })),
  )
  const uploads = await ctx.loadUploads()
  const expected = [
    uploads.some((u) => u.kind === 'UPLOAD_LOGO') &&
      'the logo in the header of every slide',
    uploads.some((u) => u.kind === 'UPLOAD_PRODUCT') &&
      "the post's product standing in the scene, with its real label",
  ].filter(Boolean)
  const analysis = ctx.outputs.ANALYSIS
  return runPrompt(
    ctx,
    'review',
    ReviewDraft,
    {
      brand: ctx.brief.brandName,
      colors:
        analysis?.colors.map((c) => `${c.name} ${c.hex}`).join(', ') ||
        'not known',
      visualStyle: analysis?.visualStyle ?? 'not known',
      expected:
        expected.join(' and ') || 'none were uploaded, so do not expect them',
      slides: slides
        .map(
          (s, i) =>
            `Image ${i + 1}: post ${s.postIndex}, slide ${s.order} of ${s.total} (${s.format}). Text: "${s.text}"`,
        )
        .join('\n'),
    },
    images,
  )
}

const findCheck = (
  checks: Array<SlideCheck>,
  s: { postIndex: number; order: number },
) => checks.find((c) => c.postIndex === s.postIndex && c.order === s.order)

export const reviewPhase: Phase<'REVIEW'> = {
  key: 'REVIEW',
  outputSchema: ReviewOutput,
  execute: async (ctx) => {
    const posts = await ctx.loadPosts()
    const slides: Array<SlideUnderReview> = posts.flatMap((post) => {
      const rendered = post.slides.filter((s) => s.assetId)
      return post.slides.map((s) => ({
        postIndex: post.index,
        order: s.order,
        total: Math.max(rendered.length, 1),
        format: post.format,
        text: s.text,
        assetId: s.assetId,
      }))
    })

    const rules = new Map<string, Array<string>>()
    for (const s of slides) {
      const asset = s.assetId ? await ctx.readAsset(s.assetId) : null
      rules.set(
        `${s.postIndex}/${s.order}`,
        ruleIssues({
          ...s,
          width: asset?.width ?? null,
          height: asset?.height ?? null,
        }),
      )
    }
    const rendered = slides.filter((s) => s.assetId)

    let usage: LlmUsage = NO_USAGE
    const first = rendered.length ? await check(ctx, rendered) : null
    if (first?.usage) usage = addUsage(usage, first.usage)
    const checks = first?.output.slides ?? []

    const failing = rendered.filter(
      (s) => findCheck(checks, s)?.passed === false,
    )
    const replaced: Array<RenderedSlide> = []
    if (failing.length && MAX_REGENERATIONS > 0) {
      const tools = {
        images: ctx.images,
        renderer: ctx.renderer,
        prompts: ctx.prompts,
        uploads: await ctx.loadUploads(),
        websiteShots: await websiteShots(ctx),
        saveAsset: (...args: Parameters<typeof ctx.saveAsset>) =>
          ctx.saveAsset(...args),
      }
      for (const s of failing) {
        const post = posts.find((p) => p.index === s.postIndex)
        if (!post) continue
        const design = {
          brief: ctx.brief,
          analysis: ctx.outputs.ANALYSIS,
          index: post.index,
          format: post.format,
          goal: post.goal,
          concept: post.concept,
          product: post.product,
        }
        const instruction = findCheck(checks, s)?.issues.join(' ') ?? ''
        const background = await makeBackground(tools, design, instruction)
        usage = addUsage(usage, background.image.usage)
        const assetId = await renderSlide(tools, {
          post: design,
          text: s.text,
          order: s.order,
          total: s.total,
          background: background.image,
        })
        replaced.push({
          postIndex: s.postIndex,
          order: s.order,
          assetId,
          backgroundAssetId: background.assetId,
        })
        s.assetId = assetId
      }
      const second = await check(ctx, failing)
      usage = addUsage(usage, second.usage ?? NO_USAGE)
      for (const c of second.output.slides) {
        const i = checks.findIndex(
          (x) => x.postIndex === c.postIndex && x.order === c.order,
        )
        if (i >= 0) checks[i] = c
      }
    }

    const results = slides.map((s) => {
      const ruleIssueList = rules.get(`${s.postIndex}/${s.order}`) ?? []
      const model = findCheck(checks, s)
      return {
        postIndex: s.postIndex,
        order: s.order,
        passed: ruleIssueList.length === 0 && (model?.passed ?? true),
        issues: model?.issues ?? [],
        ruleIssues: ruleIssueList,
        regenerated: replaced.some(
          (r) => r.postIndex === s.postIndex && r.order === s.order,
        ),
      }
    })
    const unsupported = (ctx.outputs.COPY?.unsupported ?? []).map(
      (f) =>
        `Post ${f.postIndex}, ${f.place === 'caption' ? 'caption' : `slide ${f.place}`}: "${f.value}" appears in no source`,
    )

    return {
      output: {
        score: results.length
          ? results.filter((r) => r.passed).length / results.length
          : 0,
        slides: results,
        issues: unsupported,
        replaced,
      },
      promptId: first?.promptId,
      model: first?.model,
      usage,
    }
  },
}
