import { useState } from 'react'

import {
  AnalysisOutput,
  PHASE_OUTPUT_SCHEMAS,
  type PhaseRunDto,
} from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'

import { AnalysisView } from '@/components/analysis-view'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { useApprovePhase } from '@/hooks/queries/runs/useApprovePhase'
import { useRerunPhase } from '@/hooks/queries/runs/useRerunPhase'
import { formatPhaseOutput } from '@/utils/phase-json'

interface ApprovalPanelProps {
  runId: string
  phase: PhaseRunDto
}

/** Shows the AI proposal as editable JSON; approve it as is, with edits, or run it again. */
export function ApprovalPanel({ runId, phase }: ApprovalPanelProps) {
  const { t } = useTranslation()
  const original = formatPhaseOutput(phase.phase, phase.output)
  const [text, setText] = useState(original)
  const [error, setError] = useState<string>()
  const approve = useApprovePhase()
  const rerun = useRerunPhase()
  const busy = approve.isPending || rerun.isPending
  const edited = text !== original

  const submit = () => {
    let value: unknown
    try {
      value = JSON.parse(text)
    } catch {
      setError(t('approval.invalidJson'))
      return
    }
    const parsed = PHASE_OUTPUT_SCHEMAS[phase.phase].safeParse(value)
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join('.') || 'output'}: ${i.message}`)
          .join('; '),
      )
      return
    }
    setError(undefined)
    approve.mutate({
      id: runId,
      phase: phase.phase,
      editedOutput: edited ? parsed.data : undefined,
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('approval.hint')}</p>
      {phase.phase === 'ANALYSIS' && <AnalysisPreview text={text} />}
      <Textarea
        aria-label={t('approval.outputLabel')}
        className="scrollbar-thin min-h-64 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => rerun.mutate({ id: runId, phase: phase.phase })}
        >
          {t('phaseTimeline.runAgain')}
        </Button>
        <Button type="button" disabled={busy} onClick={submit}>
          {edited ? t('approval.approveWithEdits') : t('approval.approve')}
        </Button>
      </div>
    </div>
  )
}

/** Shows the analysis as it reads, following the JSON while it is valid. */
function AnalysisPreview({ text }: { text: string }) {
  const { t } = useTranslation()
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  const analysis = AnalysisOutput.safeParse(value)
  if (!analysis.success) return null
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{t('analysis.preview')}</p>
      <AnalysisView analysis={analysis.data} />
    </div>
  )
}
