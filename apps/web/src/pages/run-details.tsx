import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { AssetGrid } from '@/components/asset-grid'
import { BackLink } from '@/components/back-link'
import { DeleteRunButton } from '@/components/delete-run-button'
import { PhaseTimeline } from '@/components/phase-timeline'
import { RunStatusBadge } from '@/components/run-status-badge'
import { SourcesList } from '@/components/sources-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useGetRunById } from '@/hooks/queries/runs/useGetRunById'
import { useStartRun } from '@/hooks/queries/runs/useStartRun'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { NotFound } from '@/pages/not-found'

export function RunDetails() {
  const { t } = useTranslation()
  const localized = useLocalizedPath()
  const { id = '' } = useParams()
  const { data: run, isPending } = useGetRunById({
    id,
    queryOptions: {
      // Poll while a phase is queued or running.
      refetchInterval: (query) =>
        query.state.data?.status === 'RUNNING' ? 2000 : false,
    },
  })
  const startRun = useStartRun()

  if (isPending)
    return <p className="text-muted-foreground">{t('common.loading')}</p>
  if (!run) return <NotFound title={t('common.runNotFound')} />

  const { brief } = run
  // References are the person's uploads; generated backgrounds and slides show in the posts.
  const uploads = run.assets.filter((a) => a.kind.startsWith('UPLOAD_'))
  return (
    <section className="space-y-6">
      <BackLink to="/" label={t('runs.title')} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{run.brandName}</h1>
        <div className="flex items-center gap-3">
          <RunStatusBadge status={run.status} />
          <DeleteRunButton run={run} />
          {run.phases.length === 0 && (
            <Button asChild variant="outline">
              <Link to={localized(`/runs/${run.id}/edit`)}>
                {t('runDetails.editBrief')}
              </Link>
            </Button>
          )}
          {(run.status === 'DRAFT' || run.status === 'FAILED') && (
            <Button
              type="button"
              disabled={startRun.isPending}
              onClick={() => startRun.mutate(run.id)}
            >
              {run.phases.length
                ? t('runDetails.continue')
                : t('runDetails.start')}
            </Button>
          )}
        </div>
      </div>

      {/* Two columns on large screens: the phases on the left; the brief, uploads and sources they work from on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('runDetails.phases')}</CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseTimeline run={run} />
            </CardContent>
          </Card>
        </div>
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('runDetails.brief')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <a className="underline" href={brief.instagramUrl}>
                {brief.instagramUrl}
              </a>
              <p>{brief.reason}</p>
              <Detail label={t('runDetails.links')}>
                {brief.links.map((l) => (
                  <li key={l.url}>
                    {t(`brief.linkTypes.${l.type}`).toLowerCase()}:{' '}
                    <a className="underline" href={l.url}>
                      {l.url}
                    </a>
                  </li>
                ))}
              </Detail>
              <Detail label={t('runDetails.products')}>
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
                <span className="font-medium">{t('runDetails.audience')}</span>{' '}
                {brief.audience}
              </p>
              <p>
                <span className="font-medium">{t('runDetails.goals')}</span>{' '}
                {brief.goals}
              </p>
              {brief.inspiration && (
                <p>
                  <span className="font-medium">
                    {t('runDetails.inspiration')}
                  </span>{' '}
                  {brief.inspiration}
                </p>
              )}
              {brief.inspirationLinks.length > 0 && (
                <Detail label={t('runDetails.inspirationLinks')}>
                  {brief.inspirationLinks.map((url) => (
                    <li key={url}>
                      <a className="underline" href={url}>
                        {url}
                      </a>
                    </li>
                  ))}
                </Detail>
              )}
              {brief.formats.length > 0 && (
                <p>
                  <span className="font-medium">
                    {t('runDetails.preferredFormats')}
                  </span>{' '}
                  {brief.formats
                    .map((f) => t(`brief.formatTypes.${f}`).toLowerCase())
                    .join(', ')}
                </p>
              )}
              <p>
                <span className="font-medium">{t('runDetails.language')}</span>{' '}
                {t(`outputLanguage.${brief.language}`)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t('runDetails.references', { count: uploads.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssetGrid
                runId={run.id}
                assets={uploads}
                removable={run.phases.length === 0}
              />
            </CardContent>
          </Card>

          {run.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('sources.title', { count: run.sources.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SourcesList sources={run.sources} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
