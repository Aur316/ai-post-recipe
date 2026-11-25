import type { RunSummaryDto } from '@ai-post-recipe/shared'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

import { runsQueryFunctions } from '@/data/query-functions/runs'
import { runsQueryKeys } from '@/data/query-keys/runs'

interface UseGetRunsProps {
  queryOptions?: Partial<UseQueryOptions<Array<RunSummaryDto>, Error>>
}

export const useGetRuns = ({ queryOptions }: UseGetRunsProps = {}) => {
  return useQuery<Array<RunSummaryDto>, Error>({
    queryKey: runsQueryKeys.lists(),
    queryFn: runsQueryFunctions.list,
    ...queryOptions,
  })
}
