import type { PostFormat } from '@ai-post-recipe/shared'
import { sizeFor } from '@ai-post-recipe/slide-templates'

export interface StoredSlideImage {
  postIndex: number
  order: number
  format: PostFormat
  assetId: string | null
  width: number | null
  height: number | null
}

/** Fixed checks that need no model: the PNG exists and has the Instagram size. */
export function ruleIssues(slide: StoredSlideImage): Array<string> {
  if (!slide.assetId) return ['The slide has no rendered image']
  const expected = sizeFor(slide.format)
  if (slide.width !== expected.width || slide.height !== expected.height) {
    return [
      `The image is ${slide.width ?? '?'}×${slide.height ?? '?'} px instead of ${expected.width}×${expected.height}`,
    ]
  }
  return []
}
