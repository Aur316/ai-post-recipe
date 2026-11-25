export const runsQueryKeys = {
  all: ['runs'] as const,
  lists: () => [...runsQueryKeys.all, 'list'] as const,
  details: () => [...runsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...runsQueryKeys.details(), id] as const,
}
