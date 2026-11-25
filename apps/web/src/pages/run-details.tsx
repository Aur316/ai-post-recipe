import { useParams } from 'react-router'

import { RunStatusBadge } from '@/components/run-status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { assetsQueryFunctions } from '@/data/query-functions/assets'
import { useGetRunById } from '@/hooks/queries/runs/useGetRunById'
import { UPLOAD_KIND_LABELS } from '@/utils/uploads'

export function RunDetails() {
  const { id = '' } = useParams()
  const { data: run, isPending } = useGetRunById({ id })

  if (isPending) return <p className="text-muted-foreground">Loading…</p>
  if (!run) return <p className="text-muted-foreground">Run not found.</p>

  const { brief } = run
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{run.brandName}</h1>
        <RunStatusBadge status={run.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <a className="underline" href={brief.instagramUrl}>
            {brief.instagramUrl}
          </a>
          <p>{brief.reason}</p>
          <Detail label="Links">
            {brief.links.map((l) => (
              <li key={l.url}>
                {l.type.toLowerCase()}:{' '}
                <a className="underline" href={l.url}>
                  {l.url}
                </a>
              </li>
            ))}
          </Detail>
          <Detail label="Products">
            {brief.products.map((p) => (
              <li key={p.name}>
                {p.url ? (
                  <a className="underline" href={p.url}>
                    {p.name}
                  </a>
                ) : (
                  p.name
                )}
              </li>
            ))}
          </Detail>
          <p>
            <span className="font-medium">Audience:</span> {brief.audience}
          </p>
          <p>
            <span className="font-medium">Goals:</span> {brief.goals}
          </p>
          <p>
            <span className="font-medium">Language:</span>{' '}
            {brief.language === 'hr' ? 'Croatian' : 'English'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>References ({run.assets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {run.assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {run.assets.map((asset) => (
                <li key={asset.id} className="space-y-1">
                  <img
                    src={assetsQueryFunctions.url(asset.id)}
                    alt={
                      UPLOAD_KIND_LABELS[
                        asset.kind as keyof typeof UPLOAD_KIND_LABELS
                      ] ?? asset.kind
                    }
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                  <p className="text-xs text-muted-foreground">
                    {UPLOAD_KIND_LABELS[
                      asset.kind as keyof typeof UPLOAD_KIND_LABELS
                    ] ?? asset.kind}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <ul className="list-inside list-disc">{children}</ul>
    </div>
  )
}
