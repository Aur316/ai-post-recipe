import {
  Brief,
  IdParams,
  ListQuery,
  OutputLanguage,
  type RunDetailDto,
  type RunListResponse,
  type RunSummaryDto,
} from '@ai-post-recipe/shared'
import type { Request, Response } from 'express'

import type { Run } from '../../generated/prisma/client.js'
import { validate } from '../../lib/validate.js'
import type { RunService } from '../../services/run/run.service.js'
import { toAssetDto } from '../asset/asset.controller.js'
import { toPhaseRunDto } from '../pipeline/pipeline.controller.js'

export class RunController {
  constructor(private readonly runs: RunService) {}

  create = async (req: Request, res: Response) => {
    const brief = validate(Brief, req.body)
    const run = await this.runs.create(brief)
    res.status(201).json(toRunSummaryDto(run))
  }

  list = async (req: Request, res: Response) => {
    const result = await this.runs.list(validate(ListQuery, req.query))
    const body: RunListResponse = {
      ...result,
      items: result.items.map(toRunSummaryDto),
    }
    res.json(body)
  }

  get = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    res.json(toRunDetailDto(await this.runs.get(id)))
  }

  update = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    const brief = validate(Brief, req.body)
    res.json(toRunDetailDto(await this.runs.update(id, brief)))
  }
}

function toRunDetailDto({
  run,
  assets,
  phases,
}: Awaited<ReturnType<RunService['get']>>): RunDetailDto {
  return {
    ...toRunSummaryDto(run),
    brief: Brief.parse(run.brief),
    assets: assets.map(toAssetDto),
    phases: phases.map(toPhaseRunDto),
  }
}

function toRunSummaryDto(run: Run): RunSummaryDto {
  return {
    id: run.id,
    brandName: run.brandName,
    instagram: run.instagram,
    language: OutputLanguage.parse(run.language),
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  }
}
