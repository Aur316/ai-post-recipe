# M4 · Pipeline engine

**Goal:** a run moves through all eight phases as background jobs, stops at the two approval gates, and any phase can be re-run. The phases still use a fake LLM.

**Status:** Done

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

**US-4.5** As an **operator**, I want to edit the brief before I start the run, so that I can fix it without creating a new run.

- A run starts only when the operator presses **Start**; until then **Edit brief** opens the wizard with the saved brief.
- `PUT /api/runs/:id` replaces the brief; once any phase has run it returns `409 RUN_ALREADY_STARTED`.
- Uploaded references can be removed (`DELETE /api/assets/:id`) or added until the start; after it both return `409 RUN_ALREADY_STARTED`.

**US-4.4** As a **developer**, I want a fake LLM provider, so that the whole pipeline can be tested without a key.

- `FakeLlmProvider` returns recorded JSON per phase.
- An API test drives a run from start to export.

## Tasks

**Engine**

- [x] `JobQueue` interface with `PgBossQueue` (started with the API) and `MemoryQueue` (tests) in `providers/queue/`
- [x] Enqueue a phase in the same transaction as its status change (tested against real pg-boss: commit delivers, rollback does not)
- [x] ESLint rule: only `providers/queue/` may import pg-boss
- [x] `Phase` interface, `PhaseContext` and the phase output schemas in `packages/shared`
- [x] Phase runner: claim (idempotent), execute, validate the output, save it with usage and cost, advance
- [x] `PipelineService` state machine: start, approve (with schema-checked edits), re-run (later phases become stale)
- [x] Derived run status
- [x] Retries with backoff (2 retries); `FAILED` with the error message after the last one
- [x] All eight phases: analysis, plan and copy through `FakeLlmProvider`; research, visuals, review and export as placeholders until M5–M8

**API**

- [x] `POST /api/runs/:id/start`
- [x] `POST /api/runs/:id/phases/:phase/approve` with an optional edited output
- [x] `POST /api/runs/:id/phases/:phase/rerun`
- [x] 409 for every illegal transition, 400 for an unknown phase or an invalid edit
- [x] `GET /api/runs/:id` returns the latest attempt of each phase
- [x] `PUT /api/runs/:id` edits the brief until the run starts (the not-started check is part of the update)
- [x] `DELETE /api/assets/:id` for uploaded references before the start; uploads after the start return 409

**Web**

- [x] Polling while the run is `RUNNING` (`useGetRunById` with `refetchInterval`)
- [x] `PhaseTimeline` with status, attempt, duration, cost, model and prompt per phase, output on demand
- [x] `ApprovalPanel`: JSON editor checked against the shared schema; approve, approve with edits, run again
- [x] Start / Continue button on the run details page
- [x] Edit brief (`/runs/:id/edit`): the wizard filled with the saved brief, shown only before the start
- [x] Remove button on uploaded references (run details and the edit wizard), only before the start

**Tests**

- [x] Unit tests for the run status and the next phase to run
- [x] API tests: full run through both gates with an edit, 409s, invalid edit, re-run with stale phases, retry then success, failure after retries and continue
- [x] Real pg-boss: job commits and rolls back with the transaction
- [x] API tests: brief edit before the start, 409 after it, invalid brief, unknown run; reference delete before the start, 409 after it, upload after the start
- [x] Web tests: start, approve, approve with edits, invalid JSON, brief edit, no edit after the start, reference removal

## Exit criteria

- A run goes from start to export in the browser with fake data, pausing twice for approval.
