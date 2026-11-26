import {
  Brief,
  IdParams,
  ListQuery,
  OutputLanguage,
  type PostDto,
  PostFormat,
  type RunDetailDto,
  type RunListResponse,
  type RunSummaryDto,
  type SourceDto,
  type Usage,
} from '@ai-post-recipe/shared'
import type { Request, Response } from 'express'

import type { Post, Run, Source } from '../../generated/prisma/client.js'
import { validate } from '../../lib/validate.js'
import { toSlides } from '../../repositories/post/post.repo.js'
import type { RunService } from '../../services/run/run.service.js'
import { toAssetDto } from '../asset/asset.controller.js'
import { toPhaseRunDto } from '../pipeline/pipeline.controller.js'

export class RunController {
  constructor(private readonly runs: RunService) {}

  create = async (req: Request, res: Response) => {
    const brief = validate(Brief, req.body)
    const run = await this.runs.create(brief)
    res
      .status(201)
      .json(toRunSummaryDto(run, { costUsd: 0, tokensIn: 0, tokensOut: 0 }))
  }

  list = async (req: Request, res: Response) => {
    const result = await this.runs.list(validate(ListQuery, req.query))
    const body: RunListResponse = {
      ...result,
      items: result.items.map(({ run, usage }) => toRunSummaryDto(run, usage)),
    }
    res.json(body)
  }

  get = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    res.json(toRunDetailDto(await this.runs.get(id)))
  }

  remove = async (req: Request, res: Response) => {
    const { id } = validate(IdParams, req.params)
    await this.runs.remove(id)
    res.status(204).end()
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
  sources,
  posts,
  usage,
  usageByPhase,
}: Awaited<ReturnType<RunService['get']>>): RunDetailDto {
  return {
    ...toRunSummaryDto(run, usage),
    usageByPhase,
    brief: Brief.parse(run.brief),
    assets: assets.map(toAssetDto),
    phases: phases.map(toPhaseRunDto),
    sources: sources.map(toSourceDto),
    posts: posts.map(toPostDto),
  }
}

export function toPostDto(post: Post): PostDto {
  return {
    id: post.id,
    index: post.index,
    format: PostFormat.parse(post.format),
    goal: post.goal,
    concept: post.concept,
    rationale: post.rationale,
    product: post.product,
    caption: post.caption,
    hashtags: post.hashtags,
    slides: toSlides(post.slides),
  }
}

function toSourceDto(source: Source): SourceDto {
  return {
    id: source.id,
    url: source.url,
    title: source.title,
    excerpt: source.excerpt,
    reachable: source.reachable,
    error: source.error,
    origin: source.origin,
    fetchedAt: source.fetchedAt.toISOString(),
  }
}

function toRunSummaryDto(run: Run, usage: Usage): RunSummaryDto {
  return {
    id: run.id,
    brandName: run.brandName,
    instagram: run.instagram,
    language: OutputLanguage.parse(run.language),
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    usage,
  }
}
