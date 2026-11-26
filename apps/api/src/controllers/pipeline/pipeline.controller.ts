import {
  ApprovePhaseBody,
  IdParams,
  PhaseParams,
  type PhaseRunDto,
} from '@ai-post-recipe/shared'
import type { Request, Response } from 'express'

import type { PhaseRun } from '../../generated/prisma/client.js'
import { validate } from '../../lib/validate.js'
import type { PipelineService } from '../../services/pipeline/pipeline.service.js'

export class PipelineController {
  constructor(private readonly pipeline: PipelineService) {}

  start = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    await this.pipeline.start(id)
    res.status(202).end()
  }

  approve = async (req: Request, res: Response) => {
    const { id, phase } = validate(PhaseParams, req.params)
    const { editedOutput } = validate(ApprovePhaseBody, req.body ?? {})
    await this.pipeline.approve(id, phase, editedOutput)
    res.status(202).end()
  }

  rerun = async (req: Request, res: Response) => {
    const { id, phase } = validate(PhaseParams, req.params)
    await this.pipeline.rerun(id, phase)
    res.status(202).end()
  }
}

export function toPhaseRunDto(p: PhaseRun): PhaseRunDto {
  return {
    id: p.id,
    phase: p.phase,
    attempt: p.attempt,
    status: p.status,
    output: p.output,
    editedOutput: p.editedOutput,
    promptId: p.promptId,
    model: p.model,
    tokensIn: p.tokensIn,
    tokensOut: p.tokensOut,
    costUsd: p.costUsd === null ? null : Number(p.costUsd),
    error: p.error,
    startedAt: p.startedAt?.toISOString() ?? null,
    finishedAt: p.finishedAt?.toISOString() ?? null,
  }
}
