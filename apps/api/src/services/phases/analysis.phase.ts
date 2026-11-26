import { AnalysisOutput } from '@ai-post-recipe/shared'

import { captureAssetIds, shrinkImage, toLlmImages } from './images.js'
import { LANGUAGE_NAMES, type Phase, runPrompt } from './phase.js'
import { normalizeUrl } from './research.phase.js'

export const analysisPhase: Phase<'ANALYSIS'> = {
  key: 'ANALYSIS',
  outputSchema: AnalysisOutput,
  execute: async (ctx) => {
    const sources = ctx.outputs.RESEARCH?.sources ?? []
    const website = ctx.brief.styleSource === 'WEBSITE'
    const uploads = await ctx.loadUploads()
    const fromUploads = website
      ? uploads.filter(
          (u) => u.kind === 'UPLOAD_LOGO' || u.kind === 'UPLOAD_PRODUCT',
        )
      : uploads
    const captures = website ? (ctx.outputs.RESEARCH?.captures ?? []) : []
    const shots = captures.flatMap((c) =>
      captureAssetIds([c]).map((assetId, i) => ({
        url: c.url,
        assetId,
        part: i + 1,
      })),
    )
    const uploadImages = await toLlmImages(fromUploads)
    const captureImages = await Promise.all(
      shots.map(async (s, i) => ({
        label: `Image ${uploadImages.length + i + 1}: Screenshot of the brand's website, ${s.url} (part ${s.part}, top to bottom)`,
        ...(await shrinkImage((await ctx.readAsset(s.assetId)).data)),
      })),
    )
    const images = [...uploadImages, ...captureImages]
    const websiteColors = [...new Set(captures.flatMap((c) => c.colors))]

    const result = await runPrompt(
      ctx,
      'analysis',
      AnalysisOutput,
      {
        language: LANGUAGE_NAMES[ctx.brief.language],
        brief: ctx.brief,
        sources: sources.map((s) =>
          s.reachable
            ? { url: s.url, title: s.title, text: s.text }
            : { url: s.url, unreachable: s.error },
        ),
        images: images.length
          ? images.map((i) => i.label).join('\n')
          : 'No images were uploaded.',
        websiteColors: websiteColors.length
          ? websiteColors.join(', ')
          : 'None (the style comes from the uploaded images).',
      },
      images,
    )

    const readable = new Set(
      sources.filter((s) => s.reachable).map((s) => normalizeUrl(s.url)),
    )
    const claims = result.output.claims.map((claim) =>
      claim.status === 'verified' &&
      (!claim.sourceUrl || !readable.has(normalizeUrl(claim.sourceUrl)))
        ? {
            ...claim,
            status: 'assumption' as const,
            sourceUrl: null,
            evidence: null,
          }
        : claim,
    )
    return { ...result, output: { ...result.output, claims } }
  },
}
