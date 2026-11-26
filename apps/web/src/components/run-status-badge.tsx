import type { RunStatus } from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

import { RUN_STATUS_TONES } from '@/utils/status-tones'

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const { t } = useTranslation()
  return (
    <Badge variant={RUN_STATUS_TONES[status]}>{t(`runStatus.${status}`)}</Badge>
  )
}
