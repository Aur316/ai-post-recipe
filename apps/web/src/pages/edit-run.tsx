import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { BackLink } from '@/components/back-link'
import { BriefForm } from '@/components/brief-form'

import { cn } from '@/lib/utils'

import { useGetRunById } from '@/hooks/queries/runs/useGetRunById'
import { NotFound } from '@/pages/not-found'
import { PAGE_WIDTH } from '@/utils/layout'

export function EditRun() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const { data: run, isPending } = useGetRunById({ id })

  if (isPending)
    return <p className="text-muted-foreground">{t('common.loading')}</p>
  if (!run) return <NotFound title={t('common.runNotFound')} />

  return (
    <section className={cn(PAGE_WIDTH, 'space-y-6')}>
      <BackLink to={`/runs/${run.id}`} label={run.brandName} />
      <h1 className="text-2xl font-semibold">{t('editRun.title')}</h1>
      {run.phases.length > 0 ? (
        <p className="text-muted-foreground">{t('editRun.alreadyStarted')}</p>
      ) : (
        // Keyed by id, so the form starts from this run's brief.
        <BriefForm key={run.id} run={run} />
      )}
    </section>
  )
}
