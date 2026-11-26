import { IdParams } from '@ai-post-recipe/shared'
import type { Request, Response } from 'express'

import { validate } from '../../lib/validate.js'
import type { ExportService } from '../../services/export/export.service.js'

export class ExportController {
  constructor(private readonly exports: ExportService) {}

  download = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    const zip = await this.exports.build(id)
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${zip.fileName}"`,
    )
    res.setHeader('Content-Length', String(zip.data.length))
    res.end(zip.data)
  }
}
