import { PHASE_ORDER } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { deriveRunStatus, nextPhaseToRun } from './run-status.js'

const all = (status: 'DONE' | 'APPROVED') =>
  PHASE_ORDER.map((phase) => ({ phase, status }))

describe('deriveRunStatus', () => {
  it.each([
    [[], 'DRAFT'],
    [[{ phase: 'BRIEF', status: 'RUNNING' }], 'RUNNING'],
    [[{ phase: 'BRIEF', status: 'PENDING' }], 'RUNNING'],
    [[{ phase: 'ANALYSIS', status: 'AWAITING_APPROVAL' }], 'AWAITING_APPROVAL'],
    [[{ phase: 'COPY', status: 'FAILED' }], 'FAILED'],
    [
      [
        { phase: 'BRIEF', status: 'DONE' },
        { phase: 'RESEARCH', status: 'STALE' },
      ],
      'DRAFT',
    ],
    [all('DONE'), 'COMPLETED'],
  ] as const)('%j → %s', (latest, expected) => {
    expect(deriveRunStatus([...latest])).toBe(expected)
  })
})

describe('nextPhaseToRun', () => {
  it('picks the first phase that is missing, failed or stale', () => {
    expect(nextPhaseToRun([])).toBe('BRIEF')
    expect(
      nextPhaseToRun([
        { phase: 'BRIEF', status: 'DONE' },
        { phase: 'RESEARCH', status: 'STALE' },
      ]),
    ).toBe('RESEARCH')
    expect(nextPhaseToRun(all('APPROVED'))).toBeUndefined()
  })
})
