import type { RunDetailDto } from '@ai-post-recipe/shared'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

import { runsQueryFunctions } from '@/data/query-functions/runs'
import { runsQueryKeys } from '@/data/query-keys/runs'

interface UseGetRunByIdProps {
  id: string
  queryOptions?: Partial<UseQueryOptions<RunDetailDto, Error>>
}

export const useGetRunById = ({ id, queryOptions }: UseGetRunByIdProps) => {
  return useQuery<RunDetailDto, Error>({
    queryKey: runsQueryKeys.detail(id),
    queryFn: () => runsQueryFunctions.getById(id),
    ...queryOptions,
  })
}
