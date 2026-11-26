import { type PropsWithChildren, useState } from 'react'

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/utils/helpers'

/** 4xx: the request itself is wrong (unknown id, bad input); trying again will not help. */
const isClientError = (error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined
  return status !== undefined && status >= 400 && status < 500
}

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      // A missing record is shown by the page (404), not as a toast.
      onError: (error) => {
        if (!isClientError(error)) toast.error(getApiErrorMessage(error))
      },
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < 1 && !isClientError(error),
        gcTime: 1000 * 60 * 5,
      },
    },
  })

export function ReactQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
