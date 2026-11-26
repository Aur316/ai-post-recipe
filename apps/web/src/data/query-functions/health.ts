import type { HealthResponse } from '@ai-post-recipe/shared'

import { httpClient } from '@/clients/http'

export const healthQueryFunctions = {
  // 503 still carries the body; report it instead of failing.
  get: (): Promise<HealthResponse> =>
    httpClient.get('/api/health', undefined, { validateStatus: () => true }),
}
