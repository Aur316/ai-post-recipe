import { DEFAULT_PAGE_SIZE } from '@ai-post-recipe/shared'
import useInfiniteScroll from 'react-infinite-scroll-hook'
import { Link } from 'react-router'

import { InfiniteScrollSpinner } from '@/components/infinite-scroll-spinner'
import { RunStatusBadge } from '@/components/run-status-badge'
import { Button } from '@/components/ui/button'

import { useGetRunsInfinite } from '@/hooks/queries/runs/useGetRunsInfinite'

export function Runs() {
  const { runs, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useGetRunsInfinite({ params: { page: 1, size: DEFAULT_PAGE_SIZE } })

  const [sentryRef] = useInfiniteScroll({
    loading: isPending || isFetchingNextPage,
    hasNextPage,
    onLoadMore: () => void fetchNextPage(),
  })

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Runs</h1>
        <Button asChild>
          <Link to="/runs/new">New run</Link>
        </Button>
      </div>

      {isPending && <p className="text-muted-foreground">Loading…</p>}
      {!isPending && runs.length === 0 && (
        <p className="text-muted-foreground">
          No runs yet. Start one with a brand brief.
        </p>
      )}
      {runs.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {runs.map((run) => (
            <li key={run.id}>
              <Link
                to={`/runs/${run.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{run.brandName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                </div>
                <RunStatusBadge status={run.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <InfiniteScrollSpinner
        sentryRef={sentryRef}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
      />
    </section>
  )
}
