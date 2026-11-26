import { UploadAssetKind } from '@ai-post-recipe/shared'
import sharp from 'sharp'
import { v7 as uuidv7 } from 'uuid'

import {
  ConflictError,
  NotFoundError,
  UnsupportedMediaTypeError,
} from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import type { StorageProvider } from '../../providers/storage/storage.provider.js'
import type { AssetRepo } from '../../repositories/asset/asset.repo.js'
import type { RunRepo } from '../../repositories/run/run.repo.js'

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
    if (await this.runs.hasStarted(runId)) throw runAlreadyStarted()

    if (mimeType === 'image/svg+xml' && kind !== 'UPLOAD_LOGO') {
      throw new UnsupportedMediaTypeError('SVG is only allowed for logos')
    }

    const { width, height } = await readSize(buffer)
    const assetId = uuidv7()
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

  async remove(id: string) {
    const asset = await this.assets.findById(id)
    if (!asset) throw new NotFoundError('Asset', id)
    if (!UploadAssetKind.safeParse(asset.kind).success) {
      throw new ConflictError(
        'ASSET_NOT_DELETABLE',
        'Only uploaded references can be deleted',
      )
    }
    if (!(await this.assets.deleteIfRunNotStarted(id))) {
      throw runAlreadyStarted()
    }
    await this.storage.delete(asset.storageKey).catch((error: unknown) => {
      logger.warn(
        { err: error, storageKey: asset.storageKey },
        'Could not delete a stored file',
      )
    })
  }

  async open(id: string) {
    const asset = await this.assets.findById(id)
    if (!asset) throw new NotFoundError('Asset', id)
    return { asset, object: await this.storage.get(asset.storageKey) }
  }
}

function runAlreadyStarted() {
  return new ConflictError(
    'RUN_ALREADY_STARTED',
    'References can only be changed before the run is started',
  )
}

async function readSize(buffer: Buffer) {
  try {
    const { width, height } = await sharp(buffer).metadata()
    return { width: width ?? null, height: height ?? null }
  } catch {
    throw new UnsupportedMediaTypeError('The file is not a readable image')
  }
}
