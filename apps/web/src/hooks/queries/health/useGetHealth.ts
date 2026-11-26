import type { HealthResponse } from '@ai-post-recipe/shared'
import { useQuery } from '@tanstack/react-query'

import { healthQueryFunctions } from '@/data/query-functions/health'
import { healthQueryKeys } from '@/data/query-keys/health'

/** The API's health and configured providers; checked once a minute. */
export const useGetHealth = () =>
  useQuery<HealthResponse, Error>({
    queryKey: healthQueryKeys.all,
    queryFn: healthQueryFunctions.get,
    staleTime: 60_000,
  })
