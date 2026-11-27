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
import {
  type Upload,
  aspectRatio,
  shrinkImage,
  toDataUrl,
} from '../phases/images.js'

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
  const { products } = brandImages(tools.uploads, post)
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
    product: products.length
      ? `Products: ${products.map((p) => p.name).join(' and ')}, one attached photo each.`
      : '',
    instruction: instruction ? `Extra instruction: ${instruction}` : '',
  })
  const images = [
    ...(await Promise.all(
      products.map(async (p) => ({
        label: `Product photo: ${p.name} (place this exact product in the scene)`,
        ...(await shrinkImage(p.photo.data, true)),
      })),
    )),
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
  const photos = uploads.filter((u) => u.kind === 'UPLOAD_PRODUCT')
  const featured = (post.product ?? '').toLowerCase()
  const nameOf = (i: number) =>
    post.brief.products[i]?.name ?? post.product ?? 'the product'
  const named = photos.flatMap((photo, i) => {
    const name = post.brief.products[i]?.name.toLowerCase()
    return name && featured.includes(name) ? [{ name: nameOf(i), photo }] : []
  })
  const turn = (post.index - 1) % Math.max(photos.length, 1)
  const products = named.length
    ? named
    : photos
        .slice(turn, turn + 1)
        .map((photo) => ({ name: nameOf(turn), photo }))
  return { logo, products }
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
    logoAspect: logo ? await aspectRatio(logo) : undefined,
  })
  return tools.saveAsset('RENDERED_SLIDE', png, 'image/png')
}
