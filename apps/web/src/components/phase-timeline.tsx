import {
  PHASE_ORDER,
  type PhaseKey,
  type PhaseRunDto,
} from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'

import { ApprovalPanel } from '@/components/approval-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { cn } from '@/lib/utils'

import { useRerunPhase } from '@/hooks/queries/runs/useRerunPhase'
import { formatDuration, isPhaseActive } from '@/utils/phases'
import { phaseStatusTone } from '@/utils/status-tones'

interface PhaseTimelineProps {
  runId: string
  phases: Array<PhaseRunDto>
}

/** All eight phases in order, with the latest attempt of each that has started. */
export function PhaseTimeline({ runId, phases }: PhaseTimelineProps) {
  const anyActive = phases.some((p) => isPhaseActive(p.status))
  return (
    <ol className="space-y-2">
      {PHASE_ORDER.map((key, i) => (
        <PhaseItem
          key={key}
          runId={runId}
          index={i + 1}
          phaseKey={key}
          phase={phases.find((p) => p.phase === key)}
          canRerun={!anyActive}
        />
      ))}
    </ol>
  )
}

interface PhaseItemProps {
  runId: string
  index: number
  phaseKey: PhaseKey
  phase?: PhaseRunDto
  canRerun: boolean
}

function PhaseItem({
  runId,
  index,
  phaseKey,
  phase,
  canRerun,
}: PhaseItemProps) {
  const { t } = useTranslation()
  const rerun = useRerunPhase()
  const status = phase?.status
  const duration = phase && formatDuration(phase)
  const cost = phase?.costUsd ? `$${phase.costUsd.toFixed(4)}` : undefined
  const meta = [
    phase &&
      phase.attempt > 1 &&
      t('phaseTimeline.attempt', { attempt: phase.attempt }),
    duration,
    cost,
    phase?.model,
    phase?.promptId,
  ].filter(Boolean)

  return (
    <li
      className={cn(
        'rounded-lg border p-4',
        status === 'AWAITING_APPROVAL' && 'border-primary',
        status === 'STALE' && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-5 text-sm text-muted-foreground tabular-nums">
            {index}
          </span>
          <span className="font-medium">{t(`phases.${phaseKey}`)}</span>
          {isPhaseActive(status) && <Spinner className="size-4" />}
        </div>
        <div className="flex items-center gap-2">
          {meta.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {meta.join(' · ')}
            </span>
          )}
          <Badge variant={phaseStatusTone(status)}>
            {t(`phaseStatus.${status ?? 'NOT_STARTED'}`)}
          </Badge>
          {status &&
            ['DONE', 'APPROVED', 'FAILED', 'STALE'].includes(status) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canRerun || rerun.isPending}
                onClick={() => rerun.mutate({ id: runId, phase: phaseKey })}
              >
                {t('phaseTimeline.runAgain')}
              </Button>
            )}
        </div>
      </div>

      {phase?.error && (
        <p className="mt-2 text-sm text-destructive">{phase.error}</p>
      )}
      {status === 'AWAITING_APPROVAL' && phase && (
        <div className="mt-4">
          <ApprovalPanel key={phase.id} runId={runId} phase={phase} />
        </div>
      )}
      {phase && (status === 'DONE' || status === 'APPROVED') && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {phase.editedOutput
              ? t('phaseTimeline.outputEdited')
              : t('phaseTimeline.output')}
          </summary>
          <pre className="mt-2 scrollbar-thin max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(phase.editedOutput ?? phase.output, null, 2)}
          </pre>
        </details>
      )}
    </li>
  )
}
