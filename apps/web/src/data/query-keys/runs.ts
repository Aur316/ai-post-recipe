import type { RunListQuery } from '@ai-post-recipe/shared'

export const runsQueryKeys = {
  all: ['runs'] as const,
  lists: () => [...runsQueryKeys.all, 'list'] as const,
  infiniteLists: () => [...runsQueryKeys.all, 'list', 'infinite'] as const,
  infiniteList: (query: RunListQuery) =>
    [...runsQueryKeys.infiniteLists(), query] as const,
  details: () => [...runsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...runsQueryKeys.details(), id] as const,
}
