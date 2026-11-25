import type { ListQuery, RunListResponse } from '@ai-post-recipe/shared'
import {
  type InfiniteData,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'

import { runsQueryFunctions } from '@/data/query-functions/runs'
import { runsQueryKeys } from '@/data/query-keys/runs'

type RunsInfiniteQueryOptions = Partial<
  Omit<
    UseInfiniteQueryOptions<
      RunListResponse,
      Error,
      InfiniteData<RunListResponse>,
      ReturnType<typeof runsQueryKeys.infiniteList>,
      ListQuery
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
>

interface UseGetRunsInfiniteProps {
  params: ListQuery
  queryOptions?: RunsInfiniteQueryOptions
}

export const useGetRunsInfinite = ({
  params,
  queryOptions,
}: UseGetRunsInfiniteProps) => {
  const query = useInfiniteQuery<
    RunListResponse,
    Error,
    InfiniteData<RunListResponse>,
    ReturnType<typeof runsQueryKeys.infiniteList>,
    ListQuery
  >({
    queryKey: runsQueryKeys.infiniteList(params),
    queryFn: ({ pageParam }) => runsQueryFunctions.list(pageParam),
    initialPageParam: params,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length
      if (currentPage < lastPage.totalPages) {
        return { ...params, page: currentPage + 1 }
      }
      return undefined
    },
    ...queryOptions,
  })

  return {
    runs: query.data?.pages.flatMap((page) => page.items) ?? [],
    isPending: query.isPending,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => query.fetchNextPage(),
  }
}
