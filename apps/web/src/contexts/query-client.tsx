import { type PropsWithChildren, useState } from 'react'

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/utils/helpers'

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => toast.error(getApiErrorMessage(error)),
    }),
    defaultOptions: {
      queries: { retry: 1, gcTime: 1000 * 60 * 5 },
    },
  })

export function ReactQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
