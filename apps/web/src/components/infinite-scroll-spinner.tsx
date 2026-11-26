import type { ComponentProps, RefCallback } from 'react'

import { Spinner } from '@/components/ui/spinner'

import { cn } from '@/lib/utils'

interface InfiniteScrollSpinnerProps extends ComponentProps<'div'> {
  sentryRef: RefCallback<HTMLDivElement>
  isFetchingNextPage: boolean
  hasNextPage: boolean
}

export const InfiniteScrollSpinner = ({
  sentryRef,
  isFetchingNextPage,
  hasNextPage,
  className,
  ...props
}: InfiniteScrollSpinnerProps) => {
  if (!hasNextPage) return null

  return (
    <div
      ref={sentryRef}
      className={cn('mx-auto h-8 w-full', className)}
      {...props}
    >
      {isFetchingNextPage && <Spinner className="mx-auto size-5" />}
    </div>
  )
}
