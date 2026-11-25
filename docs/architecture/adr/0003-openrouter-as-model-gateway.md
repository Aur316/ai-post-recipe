# 0003 · OpenRouter as the single model gateway

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The recipe needs text, vision and image-generation models. The best model per phase may change, and reviewers should need as few API keys as possible.

## Decision

Send every model call through OpenRouter behind an `LlmProvider` interface. The model per phase is set in the prompt file's front matter and can be overridden in `.env`.

## Consequences

- One key covers every phase; switching models needs no code change.
- Each call's token usage and cost are recorded on the `PhaseRun`.
- Availability depends on one gateway; timeouts and retries handle short outages.
- Tests use `FakeLlmProvider`, so CI needs no key.
