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
import { type Upload, toDataUrl } from '../phases/images.js'

/** What making a slide needs; the visuals phase and slide regeneration share it. */
export interface SlideTools {
  images: ImageProvider
  renderer: SlideRenderer
  prompts: PromptLibrary
  uploads: Array<Upload>
  /** Stores a file of the run and returns its asset id. */
  saveAsset(
    kind: 'GENERATED_BACKGROUND' | 'RENDERED_SLIDE',
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
  /** The product the post features, for the scene. */
  product?: string
}

/** The analysis colours, or a neutral accent when there is no analysis. */
export const tokensFor = (analysis?: AnalysisOutput): BrandTokens =>
  brandTokens(analysis?.colors ?? [])

/** Asks the image model for a background (no text, logo or product) and saves it. */
export async function makeBackground(
  tools: SlideTools,
  post: PostDesign,
  instruction?: string,
) {
  const story = post.format === 'STORY'
  const prompt = tools.prompts.render('background', {
    brand: post.brief.brandName,
    colors:
      (post.analysis?.colors ?? [])
        .map((c) => `${c.name} ${c.hex}`)
        .join(', ') || 'not known',
    visualStyle: post.analysis?.visualStyle ?? 'clean, modern',
    // A scene, not the post concept: concepts mention stickers, buttons and
    // text, and image models then draw them.
    theme: `${post.product ? `${post.product}, ` : ''}${post.goal}`,
    textArea: story ? 'lower third' : 'bottom third',
    instruction: instruction ? `Extra instruction: ${instruction}` : '',
  })
  const image = await tools.images.generate({
    prompt,
    aspectRatio: aspectRatioFor(post.format),
  })
  const assetId = await tools.saveAsset(
    'GENERATED_BACKGROUND',
    image.data,
    image.mimeType,
  )
  return { assetId, image, promptId: prompt.promptId }
}

/** The uploads a slide shows: the logo, and the post's product photo. */
export function brandImages(uploads: Array<Upload>, postIndex: number) {
  const logo = uploads.find((u) => u.kind === 'UPLOAD_LOGO')
  const products = uploads.filter((u) => u.kind === 'UPLOAD_PRODUCT')
  // One product photo per post, in upload order, when there are several.
  const product = products.length
    ? products[(postIndex - 1) % products.length]
    : undefined
  return { logo, product }
}

/** Renders one slide with the real logo, product photo and text, and saves the PNG. */
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
