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
  const { product } = brandImages(tools.uploads, post)
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
    product: product
      ? `Product: ${post.product || 'the product'}, from the attached product photo.`
      : '',
    instruction: instruction ? `Extra instruction: ${instruction}` : '',
  })
  const images = [
    ...(product
      ? [
          {
            label: 'Product photo (place this exact product in the scene)',
            ...(await shrinkImage(product.data, true)),
          },
        ]
      : []),
    ...(shot
      ? [
          {
            label: "Screenshot of the brand's website (input only)",
            ...(await shrinkImage(shot.data)),
          },
        ]
      : []),
  ]
  const image = await tools.images.generate({
    prompt,
    aspectRatio: aspectRatioFor(post.format),
    images: images.length ? images : undefined,
  })
  const assetId = await tools.saveAsset(
    'GENERATED_BACKGROUND',
    image.data,
    image.mimeType,
  )
  return { assetId, image, promptId: prompt.promptId }
}

export function brandImages(
  uploads: Array<Upload>,
  post: Pick<PostDesign, 'brief' | 'index' | 'product'>,
) {
  const logo = uploads.find((u) => u.kind === 'UPLOAD_LOGO')
  const products = uploads.filter((u) => u.kind === 'UPLOAD_PRODUCT')
  const featured = (post.product ?? '').toLowerCase()
  const named = post.brief.products.findIndex(
    (p) => featured !== '' && featured.includes(p.name.toLowerCase()),
  )
  const product = products.length
    ? products[named >= 0 ? named : (post.index - 1) % products.length]
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
  const { logo } = brandImages(tools.uploads, input.post)
  const png = await tools.renderer.render({
    format: input.post.format,
    layout: input.total === 1 ? 'cover' : layoutFor(input.order, input.total),
    text: input.text,
    order: input.order,
    total: input.total,
    brandName: input.post.brief.brandName,
    tokens: tokensFor(input.post.analysis),
    backgroundUrl: await toDataUrl(input.background),
    logoUrl: logo ? await toDataUrl(logo) : undefined,
  })
  return tools.saveAsset('RENDERED_SLIDE', png, 'image/png')
}
