import { DEFAULT_PAGE_SIZE } from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'
import useInfiniteScroll from 'react-infinite-scroll-hook'
import { Link } from 'react-router'

import { InfiniteScrollSpinner } from '@/components/infinite-scroll-spinner'
import { RunStatusBadge } from '@/components/run-status-badge'
import { Button } from '@/components/ui/button'
import { UsageBadge } from '@/components/usage-summary'

import { cn } from '@/lib/utils'

import { useGetRunsInfinite } from '@/hooks/queries/runs/useGetRunsInfinite'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { PAGE_WIDTH } from '@/utils/layout'

export function Runs() {
  const { t, i18n } = useTranslation()
  const localized = useLocalizedPath()
  const { runs, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useGetRunsInfinite({ params: { page: 1, size: DEFAULT_PAGE_SIZE } })

  const [sentryRef, { rootRef }] = useInfiniteScroll({
    loading: isPending || isFetchingNextPage,
    hasNextPage,
    onLoadMore: () => void fetchNextPage(),
  })

  return (
    <section className={cn(PAGE_WIDTH, 'flex h-full flex-col gap-6')}>
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('runs.title')}</h1>
        <Button asChild>
          <Link to={localized('/runs/new')}>{t('runs.newRun')}</Link>
        </Button>
      </div>

      {isPending && (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      )}
      {!isPending && runs.length === 0 && (
        <p className="text-muted-foreground">{t('runs.empty')}</p>
      )}
      {runs.length > 0 && (
        <div
          ref={rootRef}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto rounded-lg border"
        >
          <ul className="divide-y">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  to={localized(`/runs/${run.id}`)}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{run.brandName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString(i18n.language)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {run.status === 'COMPLETED' && (
                      <UsageBadge usage={run.usage} />
                    )}
                    <RunStatusBadge status={run.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <InfiniteScrollSpinner
            sentryRef={sentryRef}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
          />
        </div>
      )}
    </section>
  )
}
