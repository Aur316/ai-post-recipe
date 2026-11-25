import type {
  BriefInput,
  ListQuery,
  RunDetailDto,
  RunListResponse,
  RunSummaryDto,
} from '@ai-post-recipe/shared'

import { httpClient } from '@/clients/http'

const ROOT = '/api/runs'

export const runsQueryFunctions = {
  list: (query: ListQuery): Promise<RunListResponse> =>
    httpClient.get(ROOT, query),
  getById: (id: string): Promise<RunDetailDto> =>
    httpClient.get(`${ROOT}/${id}`),
  create: (brief: BriefInput): Promise<RunSummaryDto> =>
    httpClient.post(ROOT, brief),
}
