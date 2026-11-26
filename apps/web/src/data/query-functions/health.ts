import type { HealthResponse } from '@ai-post-recipe/shared'

import { httpClient } from '@/clients/http'

export const healthQueryFunctions = {
  get: (): Promise<HealthResponse> =>
    httpClient.get('/api/health', undefined, { validateStatus: () => true }),
}
