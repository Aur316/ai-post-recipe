import type { PostDto, UpdatePostBody } from '@ai-post-recipe/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { type PostRef, postsQueryFunctions } from '@/data/query-functions/posts'
import { runsQueryKeys } from '@/data/query-keys/runs'
import { getApiErrorMessage } from '@/utils/helpers'

export const useUpdatePost = () => {
  const queryClient = useQueryClient()
  return useMutation<PostDto, Error, PostRef & UpdatePostBody>({
    mutationFn: postsQueryFunctions.update,
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
