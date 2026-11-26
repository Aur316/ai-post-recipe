import { useTranslation } from 'react-i18next'

import { BackLink } from '@/components/back-link'
import { BriefForm } from '@/components/brief-form'

export function AddRun() {
  const { t } = useTranslation()
  return (
    <section className="space-y-6">
      <BackLink to="/" label={t('runs.title')} />
      <h1 className="text-2xl font-semibold">{t('addRun.title')}</h1>
      <BriefForm />
    </section>
  )
}
