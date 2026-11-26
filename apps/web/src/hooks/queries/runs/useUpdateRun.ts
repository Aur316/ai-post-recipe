import type { BriefInput, RunDetailDto } from '@ai-post-recipe/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { runsQueryFunctions } from '@/data/query-functions/runs'
import { runsQueryKeys } from '@/data/query-keys/runs'
import { getApiErrorMessage } from '@/utils/helpers'

export const useUpdateRun = () => {
  const queryClient = useQueryClient()
  return useMutation<RunDetailDto, Error, { id: string; brief: BriefInput }>({
    mutationFn: runsQueryFunctions.update,
    onSuccess: (run) => {
      queryClient.setQueryData(runsQueryKeys.detail(run.id), run)
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.lists() })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
