import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { assetsQueryFunctions } from '@/data/query-functions/assets'
import { runsQueryKeys } from '@/data/query-keys/runs'
import { getApiErrorMessage } from '@/utils/helpers'

export const useDeleteAsset = () => {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: string; runId: string }>({
    mutationFn: assetsQueryFunctions.remove,
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
