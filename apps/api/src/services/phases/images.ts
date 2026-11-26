import type { UploadAssetKind } from '@ai-post-recipe/shared'
import sharp from 'sharp'

import type { LlmImage } from '../../providers/llm/llm.provider.js'
import type { StorageProvider } from '../../providers/storage/storage.provider.js'
import type { AssetRepo } from '../../repositories/asset/asset.repo.js'

const LABELS: Record<UploadAssetKind, string> = {
  UPLOAD_SCREENSHOT: 'Instagram screenshot',
  UPLOAD_PRODUCT: 'Product photo',
  UPLOAD_LOGO: 'Logo',
  UPLOAD_OTHER: 'Other reference',
}

/** Long side in pixels; larger images cost tokens without helping the analysis. */
const MAX_SIDE = 1280
const MAX_IMAGES = 12

/**
 * The run's uploads as images a vision model accepts: SVG logos become PNG,
 * large photos are scaled down, and each gets a numbered label.
 */
export async function loadReferenceImages(
  assets: AssetRepo,
  storage: StorageProvider,
  runId: string,
): Promise<Array<LlmImage>> {
  const uploads = (await assets.listByRun(runId))
    .filter((a): a is typeof a & { kind: UploadAssetKind } => a.kind in LABELS)
    .slice(0, MAX_IMAGES)

  return Promise.all(
    uploads.map(async (asset, i) => {
      const { body } = await storage.get(asset.storageKey)
      const chunks: Array<Buffer> = []
      for await (const chunk of body)
        chunks.push(Buffer.from(chunk as Uint8Array))
      const image = sharp(Buffer.concat(chunks)).resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      const keepAlpha = asset.kind === 'UPLOAD_LOGO'
      const data = keepAlpha
        ? await image.png().toBuffer()
        : await image.jpeg({ quality: 85 }).toBuffer()
      return {
        label: `Image ${i + 1}: ${LABELS[asset.kind]}`,
        mimeType: keepAlpha ? 'image/png' : 'image/jpeg',
        data,
      }
    }),
  )
}
