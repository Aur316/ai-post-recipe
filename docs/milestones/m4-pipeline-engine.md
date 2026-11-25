# M4 · Pipeline engine

**Goal:** a run moves through all eight phases as background jobs, stops at the two approval gates, and any phase can be re-run. The phases still use a fake LLM.

**Status:** Not started

## Requirements

FR-04, FR-05, FR-06, FR-07, NFR-05, NFR-07, NFR-11

## User stories

**US-4.1** As an **operator**, I want to start a run and watch its phases progress, so that I know what is happening.

- `POST /api/runs/:id/start` queues the first unfinished phase.
- The run detail page shows each phase with its status and updates every 2 seconds while a phase runs.

**US-4.2** As an **operator**, I want the run to wait for me after the analysis and the plan, so that I can correct the AI before it continues.

- After phases 3 and 4 the phase is `AWAITING_APPROVAL` and nothing else runs.
- Approving with an edited JSON saves it in `editedOutput` and starts the next phase.
- Approving a phase that is not waiting returns 409.

**US-4.3** As an **operator**, I want to re-run a phase, so that I can improve a result without starting over.

- Re-running creates a new attempt and marks every later phase `STALE`.
- Earlier attempts stay visible.

**US-4.4** As a **developer**, I want a fake LLM provider, so that the whole pipeline can be tested without a key.

- `FakeLlmProvider` returns recorded JSON per phase.
- An API test drives a run from start to export.

## Tasks

**Engine**

- [ ] pg-boss setup in the API process; one queue for phases
- [ ] `Phase` interface and `PhaseContext` ([05 · Backend](../architecture/05-backend.md#phase-contract))
- [ ] Phase runner: mark running, execute, validate the output, save it with usage and cost, advance
- [ ] State machine in `run.service` with every transition in [03 · Generation pipeline](../architecture/03-generation-pipeline.md#phase-state-machine)
- [ ] Derived run status
- [ ] Retries with backoff for failed jobs; `FAILED` with the error message after the last retry
- [ ] Stub implementations of all eight phases using the fake provider

**API**

- [ ] `POST /api/runs/:id/start`
- [ ] `POST /api/runs/:id/phases/:phase/approve` with an optional edited output
- [ ] `POST /api/runs/:id/phases/:phase/rerun`
- [ ] 409 for every illegal transition

**Web**

- [ ] `useRun` polling hook
- [ ] `PhaseTimeline` and `PhaseCard` with status, duration and cost
- [ ] Generic `ApprovalPanel` (JSON editor) with approve and re-run buttons

**Tests**

- [ ] Unit tests for every state transition
- [ ] API tests: approve → 409, re-run marks later phases stale, full run with the fake provider

## Exit criteria

- A run goes from start to export in the browser with fake data, pausing twice for approval.
