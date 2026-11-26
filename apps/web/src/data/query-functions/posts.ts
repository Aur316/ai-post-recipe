import type { PostDto, UpdatePostBody } from '@ai-post-recipe/shared'

import { httpClient } from '@/clients/http'

export interface PostRef {
  runId: string
  index: number
}

export const postsQueryFunctions = {
  update: ({
    runId,
    index,
    ...body
  }: PostRef & UpdatePostBody): Promise<PostDto> =>
    httpClient.patch(`/api/runs/${runId}/posts/${index}`, body),
  regenerateSlide: ({
    runId,
    index,
    order,
    instruction,
  }: PostRef & { order: number; instruction?: string }): Promise<PostDto> =>
    httpClient.post(
      `/api/runs/${runId}/posts/${index}/slides/${order}/regenerate`,
      {
        instruction: instruction || undefined,
      },
    ),
}
