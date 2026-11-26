import { DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { runsQueryFunctions } from '@/data/query-functions/runs'

/** A fresh ZIP of the run's posts, sources and phase outputs. */
export function DownloadZipButton({ runId }: { runId: string }) {
  const { t } = useTranslation()
  return (
    <Button asChild variant="outline">
      <a href={runsQueryFunctions.exportUrl(runId)} download>
        <DownloadIcon />
        {t('export.download')}
      </a>
    </Button>
  )
}
