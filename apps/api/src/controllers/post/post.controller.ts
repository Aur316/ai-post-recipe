import {
  PostParams,
  RegenerateSlideBody,
  SlideParams,
  UpdatePostBody,
} from '@ai-post-recipe/shared'
import type { Request, Response } from 'express'

import { validate } from '../../lib/validate.js'
import type { PostService } from '../../services/post/post.service.js'
import { toPostDto } from '../run/run.controller.js'

export class PostController {
  constructor(private readonly posts: PostService) {}

  update = async (req: Request, res: Response) => {
    const { id, index } = validate(PostParams, req.params)
    const body = validate(UpdatePostBody, req.body)
    res.json(toPostDto(await this.posts.updateText(id, index, body)))
  }

  regenerateSlide = async (req: Request, res: Response) => {
    const { id, index, order } = validate(SlideParams, req.params)
    const { instruction } = validate(RegenerateSlideBody, req.body ?? {})
    res.json(
      toPostDto(
        await this.posts.regenerateSlide(id, index, order, instruction),
      ),
    )
  }
}
