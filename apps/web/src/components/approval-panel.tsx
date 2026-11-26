import { useState } from 'react'

import { PHASE_OUTPUT_SCHEMAS, type PhaseRunDto } from '@ai-post-recipe/shared'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { useApprovePhase } from '@/hooks/queries/runs/useApprovePhase'
import { useRerunPhase } from '@/hooks/queries/runs/useRerunPhase'

interface ApprovalPanelProps {
  runId: string
  phase: PhaseRunDto
}

/** Shows the AI proposal as editable JSON; approve it as is, with edits, or run it again. */
export function ApprovalPanel({ runId, phase }: ApprovalPanelProps) {
  const original = JSON.stringify(phase.output, null, 2)
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
      setError('Not valid JSON')
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
      <p className="text-sm text-muted-foreground">
        Review the proposal. Edit the JSON if needed; the original is kept next
        to your version.
      </p>
      <Textarea
        aria-label="Phase output"
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
          Run again
        </Button>
        <Button type="button" disabled={busy} onClick={submit}>
          {edited ? 'Approve with edits' : 'Approve'}
        </Button>
      </div>
    </div>
  )
}
