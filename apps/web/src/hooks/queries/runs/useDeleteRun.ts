import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { runsQueryFunctions } from '@/data/query-functions/runs'
import { runsQueryKeys } from '@/data/query-keys/runs'
import { getApiErrorMessage } from '@/utils/helpers'

export const useDeleteRun = () => {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: runsQueryFunctions.remove,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: runsQueryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: runsQueryKeys.lists() })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
