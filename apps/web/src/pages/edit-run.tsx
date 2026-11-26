import { Link, useParams } from 'react-router'

import { BriefForm } from '@/components/brief-form'
import { Button } from '@/components/ui/button'

import { useGetRunById } from '@/hooks/queries/runs/useGetRunById'

export function EditRun() {
  const { id = '' } = useParams()
  const { data: run, isPending } = useGetRunById({ id })

  if (isPending) return <p className="text-muted-foreground">Loading…</p>
  if (!run) return <p className="text-muted-foreground">Run not found.</p>

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit brief</h1>
      {run.phases.length > 0 ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This run has already started, so its brief can no longer be edited.
          </p>
          <Button asChild variant="outline">
            <Link to={`/runs/${run.id}`}>Back to the run</Link>
          </Button>
        </div>
      ) : (
        // Keyed by id, so the form starts from this run's brief.
        <BriefForm key={run.id} run={run} />
      )}
    </section>
  )
}
