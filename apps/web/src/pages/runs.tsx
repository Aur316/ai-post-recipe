import { Link } from 'react-router'

import { RunStatusBadge } from '@/components/run-status-badge'
import { Button } from '@/components/ui/button'

import { useGetRuns } from '@/hooks/queries/runs/useGetRuns'

export function Runs() {
  const { data: runs, isPending } = useGetRuns()

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Runs</h1>
        <Button asChild>
          <Link to="/runs/new">New run</Link>
        </Button>
      </div>

      {isPending && <p className="text-muted-foreground">Loading…</p>}
      {runs?.length === 0 && (
        <p className="text-muted-foreground">
          No runs yet. Start one with a brand brief.
        </p>
      )}
      {!!runs?.length && (
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
    </section>
  )
}
