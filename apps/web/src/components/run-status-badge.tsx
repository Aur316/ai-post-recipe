import type { RunStatus } from '@ai-post-recipe/shared'

import { Badge } from '@/components/ui/badge'

const LABELS: Record<RunStatus, string> = {
  DRAFT: 'Draft',
  RUNNING: 'Running',
  AWAITING_APPROVAL: 'Awaiting approval',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge variant={status === 'FAILED' ? 'destructive' : 'secondary'}>
      {LABELS[status]}
    </Badge>
  )
}
