import type { BriefInput, RunSummaryDto } from '@ai-post-recipe/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { runsQueryFunctions } from '@/data/query-functions/runs'
import { runsQueryKeys } from '@/data/query-keys/runs'
import { getApiErrorMessage } from '@/utils/helpers'

export const useCreateRun = () => {
  const queryClient = useQueryClient()
  return useMutation<RunSummaryDto, Error, BriefInput>({
    mutationFn: runsQueryFunctions.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.lists() })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
