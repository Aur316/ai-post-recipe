import type { AssetKind, UploadAssetKind } from '@ai-post-recipe/shared'
import sharp from 'sharp'
import { v7 as uuidv7 } from 'uuid'

import type { LlmImage } from '../../providers/llm/llm.provider.js'
import type { StorageProvider } from '../../providers/storage/storage.provider.js'
import type { AssetRepo } from '../../repositories/asset/asset.repo.js'

const LABELS: Record<UploadAssetKind, string> = {
  UPLOAD_SCREENSHOT: 'Instagram screenshot',
  UPLOAD_PRODUCT: 'Product photo',
  UPLOAD_LOGO: 'Logo',
  UPLOAD_OTHER: 'Other reference',
}

const MAX_SIDE = 1280
const MAX_IMAGES = 12

export interface Upload {
  id: string
  kind: UploadAssetKind
  mimeType: string
  data: Buffer
}

export async function loadUploads(
  assets: AssetRepo,
  storage: StorageProvider,
  runId: string,
): Promise<Array<Upload>> {
  const uploads = (await assets.listByRun(runId)).filter(
    (a): a is typeof a & { kind: UploadAssetKind } => a.kind in LABELS,
  )
  return Promise.all(
    uploads.map(async (asset) => {
      const { body } = await storage.get(asset.storageKey)
      const chunks: Array<Buffer> = []
      for await (const chunk of body) {
        chunks.push(Buffer.from(chunk as Uint8Array))
      }
      return {
        id: asset.id,
        kind: asset.kind,
        mimeType: asset.mimeType,
        data: Buffer.concat(chunks),
      }
    }),
  )
}

export async function toLlmImages(
  uploads: Array<Upload>,
  firstNumber = 1,
): Promise<Array<LlmImage>> {
  return Promise.all(
    uploads.slice(0, MAX_IMAGES).map(async (upload, i) => ({
      label: `Image ${firstNumber + i}: ${LABELS[upload.kind]}`,
      ...(await shrinkImage(upload.data, upload.kind === 'UPLOAD_LOGO')),
    })),
  )
}

export async function shrinkImage(data: Buffer, keepAlpha = false) {
  const image = sharp(data).resize({
    width: MAX_SIDE,
    height: MAX_SIDE,
    fit: 'inside',
    withoutEnlargement: true,
  })
  return keepAlpha
    ? { mimeType: 'image/png', data: await image.png().toBuffer() }
    : {
        mimeType: 'image/jpeg',
        data: await image.jpeg({ quality: 85 }).toBuffer(),
      }
}

export async function aspectRatio(upload: Pick<Upload, 'data'>) {
  const { width = 1, height = 1 } = await sharp(upload.data).metadata()
  return width / height
}

export async function toDataUrl(upload: Pick<Upload, 'mimeType' | 'data'>) {
  const png =
    upload.mimeType === 'image/svg+xml'
      ? await sharp(upload.data, { density: 300 }).png().toBuffer()
      : upload.data
  const mime =
    upload.mimeType === 'image/svg+xml' ? 'image/png' : upload.mimeType
  return `data:${mime};base64,${png.toString('base64')}`
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/zip': 'zip',
}

export async function saveGeneratedAsset(
  assets: AssetRepo,
  storage: StorageProvider,
  runId: string,
  kind: AssetKind,
  data: Buffer,
  mimeType: string,
) {
  const id = uuidv7()
  const storageKey = `runs/${runId}/${kind}/${id}.${EXTENSIONS[mimeType] ?? 'bin'}`
  const { width, height } = mimeType.startsWith('image/')
    ? await sharp(data).metadata()
    : { width: undefined, height: undefined }
  await storage.put(storageKey, data, mimeType)
  return assets.create({
    id,
    runId,
    kind,
    storageKey,
    mimeType,
    width: width ?? null,
    height: height ?? null,
    sizeBytes: data.length,
  })
}

export const captureAssetIds = (
  captures: Array<{ assetIds?: Array<string>; assetId?: string | null }>,
) =>
  captures.flatMap((c) =>
    c.assetIds?.length ? c.assetIds : c.assetId ? [c.assetId] : [],
  )

export async function readAssets(
  assets: AssetRepo,
  storage: StorageProvider,
  ids: Array<string>,
) {
  return Promise.all(
    ids.map(async (id) => {
      const asset = await assets.findById(id)
      if (!asset) throw new Error(`Asset ${id} not found`)
      const { body } = await storage.get(asset.storageKey)
      const chunks: Array<Buffer> = []
      for await (const chunk of body)
        chunks.push(Buffer.from(chunk as Uint8Array))
      return { data: Buffer.concat(chunks), mimeType: asset.mimeType }
    }),
  )
}
