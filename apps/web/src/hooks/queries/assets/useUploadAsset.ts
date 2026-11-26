import type { AssetDto } from '@ai-post-recipe/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  type UploadAssetRequest,
  assetsQueryFunctions,
} from '@/data/query-functions/assets'
import { runsQueryKeys } from '@/data/query-keys/runs'

export const useUploadAsset = () => {
  const queryClient = useQueryClient()
  return useMutation<AssetDto, Error, UploadAssetRequest>({
    mutationFn: assetsQueryFunctions.upload,
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({
        queryKey: runsQueryKeys.detail(runId),
      })
    },
  })
}
