import type { PhaseKey } from '@ai-post-recipe/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { runsQueryFunctions } from '@/data/query-functions/runs'
import { runsQueryKeys } from '@/data/query-keys/runs'
import { getApiErrorMessage } from '@/utils/helpers'

export const useRerunPhase = () => {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: string; phase: PhaseKey }>({
    mutationFn: runsQueryFunctions.rerunPhase,
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.lists() })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
