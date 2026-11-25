import type { UploadAssetKind } from '@ai-post-recipe/shared'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

import { NotFoundError, UnsupportedMediaTypeError } from '../lib/errors.js'
import type { StorageProvider } from '../providers/storage/storage.provider.js'
import type { AssetRepo } from '../repositories/asset.repo.js'
import type { RunRepo } from '../repositories/run.repo.js'

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export interface UploadInput {
  runId: string
  kind: UploadAssetKind
  mimeType: string
  buffer: Buffer
}

export class AssetService {
  constructor(
    private readonly runs: RunRepo,
    private readonly assets: AssetRepo,
    private readonly storage: StorageProvider,
  ) {}

  async upload({ runId, kind, mimeType, buffer }: UploadInput) {
    if (!(await this.runs.findById(runId)))
      throw new NotFoundError('Run', runId)

    if (mimeType === 'image/svg+xml' && kind !== 'UPLOAD_LOGO') {
      throw new UnsupportedMediaTypeError('SVG is only allowed for logos')
    }

    const { width, height } = await readSize(buffer)
    const assetId = randomUUID()
    const storageKey = `runs/${runId}/${kind}/${assetId}.${EXTENSIONS[mimeType]}`

    await this.storage.put(storageKey, buffer, mimeType)
    try {
      return await this.assets.create({
        id: assetId,
        runId,
        kind,
        storageKey,
        mimeType,
        width,
        height,
        sizeBytes: buffer.length,
      })
    } catch (error) {
      await this.storage.delete(storageKey)
      throw error
    }
  }

  async open(id: string) {
    const asset = await this.assets.findById(id)
    if (!asset) throw new NotFoundError('Asset', id)
    return { asset, object: await this.storage.get(asset.storageKey) }
  }
}

async function readSize(buffer: Buffer) {
  try {
    const { width, height } = await sharp(buffer).metadata()
    return { width: width ?? null, height: height ?? null }
  } catch {
    throw new UnsupportedMediaTypeError('The file is not a readable image')
  }
}
