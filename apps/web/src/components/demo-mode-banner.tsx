import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetHealth } from '@/hooks/queries/health/useGetHealth'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

export function DemoModeBanner() {
  const { t } = useTranslation()
  const localized = useLocalizedPath()
  const { data } = useGetHealth()
  if (data?.providers?.llm !== 'fake') return null

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-300"
    >
      {t('demoMode')}{' '}
      <Link to={localized('/onboarding')} className="font-medium underline">
        {t('demoModeLink')}
      </Link>
    </div>
  )
}
