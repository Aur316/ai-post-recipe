import type {
  BriefInput,
  ListQuery,
  PhaseKey,
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
  update: ({
    id,
    brief,
  }: {
    id: string
    brief: BriefInput
  }): Promise<RunDetailDto> => httpClient.put(`${ROOT}/${id}`, brief),
  start: (id: string): Promise<void> => httpClient.post(`${ROOT}/${id}/start`),
  approvePhase: ({
    id,
    phase,
    editedOutput,
  }: {
    id: string
    phase: PhaseKey
    editedOutput?: unknown
  }): Promise<void> =>
    httpClient.post(`${ROOT}/${id}/phases/${phase}/approve`, { editedOutput }),
  rerunPhase: ({ id, phase }: { id: string; phase: PhaseKey }): Promise<void> =>
    httpClient.post(`${ROOT}/${id}/phases/${phase}/rerun`),
}
