import {
  type AssetDto,
  IdParams,
  UploadAssetBody,
} from '@ai-post-recipe/shared'
import type { Request, Response } from 'express'

import type { Asset } from '../../generated/prisma/client.js'
import { ValidationError } from '../../lib/errors.js'
import { validate } from '../../lib/validate.js'
import type { AssetService } from '../../services/asset/asset.service.js'

export class AssetController {
  constructor(private readonly assets: AssetService) {}

  upload = async (req: Request, res: Response) => {
    const { id: runId } = validate(IdParams, req.params)
    const { kind } = validate(UploadAssetBody, req.body)
    if (!req.file) throw new ValidationError('A "file" field is required')

    const asset = await this.assets.upload({
      runId,
      kind,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    })
    res.status(201).json(toAssetDto(asset))
  }

  remove = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    await this.assets.remove(id)
    res.status(204).end()
  }

  download = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    const { asset, object } = await this.assets.open(id)
    res.setHeader('Content-Type', asset.mimeType)
    res.setHeader('Content-Length', String(asset.sizeBytes))
    res.setHeader('Cache-Control', 'private, max-age=3600')
    // SVG uploads could carry scripts; never let them run in the app origin.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'",
    )
    res.setHeader('X-Content-Type-Options', 'nosniff')
    object.body.pipe(res)
  }
}

export function toAssetDto(asset: Asset): AssetDto {
  return {
    id: asset.id,
    runId: asset.runId,
    kind: asset.kind,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
    createdAt: asset.createdAt.toISOString(),
  }
}
