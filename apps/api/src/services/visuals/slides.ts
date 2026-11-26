import type { PromptLibrary } from '@ai-post-recipe/prompts'
import type { AnalysisOutput, Brief, PostFormat } from '@ai-post-recipe/shared'
import {
  type BrandTokens,
  aspectRatioFor,
  brandTokens,
  layoutFor,
} from '@ai-post-recipe/slide-templates'

import type { ImageProvider } from '../../providers/image/image.provider.js'
import type { SlideRenderer } from '../../providers/renderer/slide-renderer.js'
import { type Upload, shrinkImage, toDataUrl } from '../phases/images.js'

export interface SlideTools {
  images: ImageProvider
  renderer: SlideRenderer
  prompts: PromptLibrary
  uploads: Array<Upload>
  websiteShots: Array<{ data: Buffer; mimeType: string }>
  saveAsset(
    kind: 'GENERATED_BACKGROUND' | 'RENDERED_SLIDE' | 'EXPORT_ZIP',
    data: Buffer,
    mimeType: string,
  ): Promise<string>
}

export interface PostDesign {
  brief: Brief
  analysis?: AnalysisOutput
  index: number
  format: PostFormat
  goal: string
  concept: string
  product?: string
}

export const tokensFor = (analysis?: AnalysisOutput): BrandTokens =>
  brandTokens(analysis?.colors ?? [])

export const referenceShot = (
  websiteShots: SlideTools['websiteShots'],
  postIndex: number,
) =>
  websiteShots.length
    ? websiteShots[(postIndex - 1) % websiteShots.length]
    : undefined

export async function makeBackground(
  tools: SlideTools,
  post: PostDesign,
  instruction?: string,
) {
  const story = post.format === 'STORY'
  const shot = referenceShot(tools.websiteShots, post.index)
  const prompt = tools.prompts.render('background', {
    brand: post.brief.brandName,
    colors:
      (post.analysis?.colors ?? [])
        .map((c) => `${c.name} ${c.hex}`)
        .join(', ') || 'not known',
    visualStyle: post.analysis?.visualStyle ?? 'clean, modern',
    theme: `${post.product ? `${post.product}, ` : ''}${post.goal}`,
    textArea: story ? 'lower third' : 'bottom third',
    reference: shot
      ? "Reference: the attached screenshot of the brand's website."
      : '',
    instruction: instruction ? `Extra instruction: ${instruction}` : '',
  })
  const image = await tools.images.generate({
    prompt,
    aspectRatio: aspectRatioFor(post.format),
    images: shot
      ? [
          {
            label: "Screenshot of the brand's website (input only)",
            ...(await shrinkImage(shot.data)),
          },
        ]
      : undefined,
  })
  const assetId = await tools.saveAsset(
    'GENERATED_BACKGROUND',
    image.data,
    image.mimeType,
  )
  return { assetId, image, promptId: prompt.promptId }
}

export function brandImages(uploads: Array<Upload>, postIndex: number) {
  const logo = uploads.find((u) => u.kind === 'UPLOAD_LOGO')
  const products = uploads.filter((u) => u.kind === 'UPLOAD_PRODUCT')
  const product = products.length
    ? products[(postIndex - 1) % products.length]
    : undefined
  return { logo, product }
}

export async function renderSlide(
  tools: SlideTools,
  input: {
    post: PostDesign
    text: string
    order: number
    total: number
    background: { data: Buffer; mimeType: string }
  },
) {
  const { logo, product } = brandImages(tools.uploads, input.post.index)
  const png = await tools.renderer.render({
    format: input.post.format,
    layout: input.total === 1 ? 'cover' : layoutFor(input.order, input.total),
    text: input.text,
    order: input.order,
    total: input.total,
    brandName: input.post.brief.brandName,
    tokens: tokensFor(input.post.analysis),
    backgroundUrl: await toDataUrl(input.background),
    productImageUrl: product ? await toDataUrl(product) : undefined,
    logoUrl: logo ? await toDataUrl(logo) : undefined,
  })
  return tools.saveAsset('RENDERED_SLIDE', png, 'image/png')
}
