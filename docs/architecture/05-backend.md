# 05 · Backend (`apps/api`)

The API uses strict layers that only call downwards: route → controller → service → repository or provider. Services know nothing about Express, repositories know nothing about business rules, and every external system sits behind an interface so tests can replace it.

```mermaid
flowchart TB
  routes[routes<br/>paths + middleware] --> controllers[controllers<br/>HTTP ↔ DTO, validation, status codes]
  controllers --> services[services<br/>run state machine, phases, export]
  services --> repositories[repositories<br/>Prisma]
  services --> providers[providers<br/>LLM · search · fetcher · storage · renderer]
  jobs[jobs<br/>pg-boss queues, phase runner] --> services
```

## Folder layout

Each layer folder is split into one subfolder per domain (`asset`, `run`, `phase-run`, `source`, `health`, …), so it is clear which file belongs to what. Tests sit next to the file they test.

```
apps/api/src/
├─ app.ts                   # builds the Express app from its dependencies (tests inject fakes)
├─ server.ts                # starts the HTTP server and the worker
├─ config/env.ts            # environment variables validated with Zod
├─ db/prisma.ts             # Prisma client with the pg driver adapter
├─ controllers/             # HTTP ↔ DTO, Zod validation, status codes
│  ├─ asset/                # asset.controller.ts (+ .test.ts)
│  ├─ health/               # health.controller.ts
│  └─ run/                  # run.controller.ts
├─ services/
│  ├─ asset/                # asset.service.ts: upload, open
│  ├─ run/                  # run.service.ts: creating, listing and reading runs
│  ├─ pipeline/             # pipeline.service.ts: state machine (start, approve, re-run); run-status.ts
│  ├─ phases/               # one file per phase: brief, research, analysis, plan, copy, visuals, review, export
│  └─ export/               # export.service.ts: builds the ZIP
├─ repositories/            # Prisma access, one folder per table
│  ├─ run/                  # run.repo.ts (+ .test.ts)
│  ├─ phase-run/            # phase-run.repo.ts
│  ├─ asset/                # asset.repo.ts
│  └─ source/               # source.repo.ts
├─ providers/               # interface + implementation for each external system
│  ├─ llm/                  # LlmProvider: FakeLlmProvider now, OpenRouterProvider in M5
│  ├─ search/               # SearchProvider: SerperProvider, NoopSearchProvider (no key)
│  ├─ fetcher/              # downloads a page, HTML → clean text, respects robots.txt
│  ├─ storage/              # StorageProvider: S3Storage, MemoryStorage (tests)
│  ├─ queue/                # JobQueue: PgBossQueue (+ an in-memory queue for tests)
│  └─ renderer/             # SlideRenderer: Playwright, slide templates → PNG
├─ jobs/                    # phase-runner.ts (claim, execute, validate, retry), queue names
├─ middleware/              # error handler, upload (multer)
├─ lib/                     # logger (pino), errors (AppError hierarchy), validate
└─ test/                    # shared test helpers: test context, fixtures
```

Routes are registered in `app.ts` while there are few of them; they move to `routes/` when it grows.

## Phase contract

Every phase implements the same interface:

```ts
interface Phase<K extends PhaseKey> {
  key: K
  outputSchema: ZodType<PhaseOutputs[K]>
  execute(ctx: PhaseContext): Promise<PhaseResult<PhaseOutputs[K]>>
}
// PhaseResult = { output, promptId?, model?, usage? }
```

The output schemas live in `packages/shared` (`PHASE_OUTPUT_SCHEMAS`), so the approval panel validates edits with the same schema as the API. `PhaseContext` carries the brief, the finished outputs of earlier phases (`editedOutput` when a person approved one, otherwise `output`) and the LLM provider. A phase never writes to the database.

The **phase runner** (`jobs/phase-runner.ts`) handles one job: it claims the phase run (`PENDING` → `RUNNING`, skipped if another delivery already took it), calls `execute`, validates the output and hands it to `PipelineService.complete`. A failed attempt goes back to `PENDING` and the queue retries it with backoff (2 retries); after the last one the phase is `FAILED` with the error. The **pipeline service** owns every status change; each change and the job it queues are one transaction.

## Job queue

Phases run as background jobs. The services and the phase runner depend on a small interface, not on pg-boss:

```ts
interface JobQueue {
  start(): Promise<void>
  stop(): Promise<void>
  send<T>(
    queue: string,
    data: T,
    options?: { tx?: TransactionClient },
  ): Promise<void>
  work<T>(
    queue: string,
    handler: (job: {
      data: T
      retryCount: number
      retryLimit: number
    }) => Promise<void>,
  ): Promise<void>
}
```

`PgBossQueue` (`providers/queue/`) implements it on the existing Postgres ([ADR 0002](adr/0002-postgres-job-queue-with-pg-boss.md)). `send` can join the caller's transaction, so a phase status change and its job are committed together. Tests use `MemoryQueue`, which runs jobs (and the jobs they send) when the test calls `drain()`.

> [!TIP]
> **Further scaling: BullMQ + Redis.** The queue can move to BullMQ on Redis by adding a `BullMqQueue` that implements `JobQueue`; nothing else changes. It needs a Redis service and an outbox table, because the database update and the Redis job are no longer one transaction. See the scaling path in ADR 0002.

## Rules

| Topic          | Rule                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM output     | Always validated with a Zod schema (structured output or JSON mode). On invalid output the call is retried once with the validation error; after that the phase is `FAILED`. |
| External calls | OpenRouter calls have a timeout and exponential backoff. Token counts and cost of every call are saved on the `PhaseRun`.                                                    |
| Models         | No model names in code. The prompt file's front matter sets the model; `.env` can override it.                                                                               |
| Cost           | The phase runner checks `MAX_COST_USD_PER_RUN` before each call and fails the phase if the cap would be exceeded.                                                            |
| Errors         | One error shape for every response: `{ "error": { "code", "message", "details?" } }`. Domain errors extend `AppError` and map to status codes in one `errorHandler`.         |
| State changes  | Only `PipelineService` changes run and phase status. An illegal transition returns `409 Conflict`.                                                                           |
| Logging        | Structured JSON logs with pino, with a request id on every line. Prompts and API keys are never logged.                                                                      |

> **Current state:** the pipeline runs end to end with `FakeLlmProvider`: phases 1–4 have their real shape, phases 5–8 are placeholders until M6–M8. OpenRouter, search and the cost cap arrive in M5.
