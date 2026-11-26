import { useEffect, useState } from 'react'

import { DEFAULT_PAGE_SIZE } from '@ai-post-recipe/shared'
import { SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useInfiniteScroll from 'react-infinite-scroll-hook'
import { Link, useSearchParams } from 'react-router'

import { InfiniteScrollSpinner } from '@/components/infinite-scroll-spinner'
import { RunStatusBadge } from '@/components/run-status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UsageBadge } from '@/components/usage-summary'

import { cn } from '@/lib/utils'

import { useGetRunsInfinite } from '@/hooks/queries/runs/useGetRunsInfinite'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { useDebounce } from '@/hooks/utils/useDebounce'
import { PAGE_WIDTH } from '@/utils/layout'
import { rememberRunsSearch } from '@/utils/runs-search'

const SEARCH_DELAY_MS = 200

export function Runs() {
  const { t, i18n } = useTranslation()
  const localized = useLocalizedPath()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const debouncedSearch = useDebounce({
    value: search.trim(),
    delay: SEARCH_DELAY_MS,
  })

  useEffect(() => {
    rememberRunsSearch(debouncedSearch)
    if ((searchParams.get('search') ?? '') === debouncedSearch) return
    setSearchParams(debouncedSearch ? { search: debouncedSearch } : {}, {
      replace: true,
    })
  }, [debouncedSearch, searchParams, setSearchParams])
  const { runs, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useGetRunsInfinite({
      params: {
        page: 1,
        size: DEFAULT_PAGE_SIZE,
        search: debouncedSearch || undefined,
      },
    })

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

      <div className="relative shrink-0">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t('runs.search')}
          placeholder={t('runs.searchPlaceholder')}
          value={search}
          maxLength={120}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isPending && (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      )}
      {!isPending && runs.length === 0 && (
        <p className="text-muted-foreground">
          {debouncedSearch
            ? t('runs.noMatch', { search: debouncedSearch })
            : t('runs.empty')}
        </p>
      )}
      {runs.length > 0 && (
        <div
          ref={rootRef}
          className="scrollbar-thin min-h-0 overflow-y-auto rounded-lg border"
        >
          <ul className="divide-y">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  to={localized(`/runs/${run.id}`)}
                  className="flex flex-col gap-2 p-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{run.brandName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString(i18n.language)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
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
