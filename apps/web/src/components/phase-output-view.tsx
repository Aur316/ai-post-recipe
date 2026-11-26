import { useState } from 'react'

import {
  AnalysisOutput,
  CopyOutput,
  type PhaseKey,
  type PhaseRunDto,
  PlanOutput,
  ResearchOutput,
  type RunDetailDto,
} from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'

import { AnalysisView } from '@/components/analysis-view'
import { BriefSummaryView } from '@/components/brief-summary-view'
import { CopyView } from '@/components/copy-view'
import { PlanView } from '@/components/plan-view'
import { ResearchView } from '@/components/research-view'
import { Button } from '@/components/ui/button'

import { findChanges } from '@/utils/changes'

/** The readable view of a phase output, or null for phases without one. */
export function OutputView({
  phase,
  value,
  run,
}: {
  phase: PhaseKey
  value: unknown
  /** Needed for the brief summary, which reads the brief itself. */
  run?: RunDetailDto
}) {
  if (phase === 'BRIEF') return run ? <BriefSummaryView run={run} /> : null
  if (phase === 'RESEARCH') {
    const parsed = ResearchOutput.safeParse(value)
    return parsed.success ? <ResearchView research={parsed.data} /> : null
  }
  if (phase === 'ANALYSIS') {
    const parsed = AnalysisOutput.safeParse(value)
    return parsed.success ? <AnalysisView analysis={parsed.data} /> : null
  }
  if (phase === 'PLAN') {
    const parsed = PlanOutput.safeParse(value)
    return parsed.success ? <PlanView plan={parsed.data} /> : null
  }
  if (phase === 'COPY') {
    const parsed = CopyOutput.safeParse(value)
    return parsed.success ? <CopyView copy={parsed.data} /> : null
  }
  return null
}

export const hasOutputView = (phase: PhaseKey) =>
  ['BRIEF', 'RESEARCH', 'ANALYSIS', 'PLAN', 'COPY'].includes(phase)

/**
 * A finished phase as it reads. When the person edited it at approval, the
 * edited version is shown, with a list of the changes and the AI proposal one
 * click away: the "own correction" the hand-in asks for.
 */
export function PhaseOutputView({
  phase,
  run,
}: {
  phase: PhaseRunDto
  run?: RunDetailDto
}) {
  const { t } = useTranslation()
  const [showOriginal, setShowOriginal] = useState(false)
  if (!hasOutputView(phase.phase)) return null

  const edited = phase.editedOutput !== null
  if (!edited) {
    return <OutputView phase={phase.phase} value={phase.output} run={run} />
  }

  const changes = findChanges(phase.output, phase.editedOutput)
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm">
        <p className="font-medium">
          {t('changes.title', { count: changes.length })}
        </p>
        <ul className="space-y-1">
          {changes.map((change) => (
            <li key={change.path} className="break-words">
              <span className="font-mono text-xs text-muted-foreground">
                {change.path}
              </span>
              <br />
              <span className="text-muted-foreground line-through">
                {show(change.before)}
              </span>{' '}
              → <span>{show(change.after)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="flex gap-1"
        role="group"
        aria-label={t('changes.version')}
      >
        <Button
          type="button"
          size="sm"
          variant={showOriginal ? 'ghost' : 'secondary'}
          aria-pressed={!showOriginal}
          onClick={() => setShowOriginal(false)}
        >
          {t('changes.edited')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showOriginal ? 'secondary' : 'ghost'}
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal(true)}
        >
          {t('changes.original')}
        </Button>
      </div>
      <OutputView
        phase={phase.phase}
        value={showOriginal ? phase.output : phase.editedOutput}
        run={run}
      />
    </div>
  )
}

const show = (value: unknown) =>
  value === undefined
    ? '—'
    : typeof value === 'string'
      ? value
      : JSON.stringify(value)
