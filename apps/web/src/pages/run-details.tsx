import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { AssetGrid } from '@/components/asset-grid'
import { BackLink } from '@/components/back-link'
import { PhaseTimeline } from '@/components/phase-timeline'
import { RunStatusBadge } from '@/components/run-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useGetRunById } from '@/hooks/queries/runs/useGetRunById'
import { useStartRun } from '@/hooks/queries/runs/useStartRun'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

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
  if (!run) {
    return (
      <section className="space-y-6">
        <BackLink to="/" label={t('runs.title')} />
        <p className="text-muted-foreground">{t('common.runNotFound')}</p>
      </section>
    )
  }

  const { brief } = run
  return (
    <section className="space-y-6">
      <BackLink to="/" label={t('runs.title')} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{run.brandName}</h1>
        <div className="flex items-center gap-3">
          <RunStatusBadge status={run.status} />
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

      <Card>
        <CardHeader>
          <CardTitle>{t('runDetails.phases')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PhaseTimeline runId={run.id} phases={run.phases} />
        </CardContent>
      </Card>

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
              <span className="font-medium">{t('runDetails.inspiration')}</span>{' '}
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
            {t('runDetails.references', { count: run.assets.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetGrid
            runId={run.id}
            assets={run.assets}
            removable={run.phases.length === 0}
          />
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
