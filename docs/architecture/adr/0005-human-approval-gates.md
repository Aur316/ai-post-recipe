# 0005 · Human approval after analysis and content plan

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The brand analysis and the content plan decide everything that follows. An error there wastes every later phase. The PDF also asks for an example of the author's own correction of the AI output.

## Decision

After phase 3 and phase 4 the run stops in `AWAITING_APPROVAL`. The person approves the proposal or edits it first. The original stays in `PhaseRun.output`, the edited version is saved in `PhaseRun.editedOutput`, and later phases use the edited version.

## Consequences

- Mistakes are caught before they cost image generation.
- The "own correction" example comes straight from the database.
- A run cannot finish unattended; this is intended.
- The edits are training material for a later feedback loop.
