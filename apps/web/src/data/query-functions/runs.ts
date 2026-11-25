import type {
  BriefInput,
  RunDetailDto,
  RunSummaryDto,
} from '@ai-post-recipe/shared'

import { httpClient } from '@/clients/http'

const ROOT = '/api/runs'

export const runsQueryFunctions = {
  list: (): Promise<Array<RunSummaryDto>> => httpClient.get(ROOT),
  getById: (id: string): Promise<RunDetailDto> =>
    httpClient.get(`${ROOT}/${id}`),
  create: (brief: BriefInput): Promise<RunSummaryDto> =>
    httpClient.post(ROOT, brief),
}
