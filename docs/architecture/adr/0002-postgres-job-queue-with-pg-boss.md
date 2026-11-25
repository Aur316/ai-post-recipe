# 0002 · Background jobs with pg-boss on PostgreSQL

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

LLM and image calls take from seconds to minutes. They must not block HTTP requests, must survive a restart, and must be retried on failure. The project already needs PostgreSQL.

## Decision

Run each phase as a pg-boss job. pg-boss stores its jobs in its own `pgboss` schema in the same database. The worker starts inside the API process.

The rest of the code never imports pg-boss: it uses a small `JobQueue` interface (`send`, `work`, `start`, `stop`), and `PgBossQueue` is its only implementation.

## Consequences

- No extra infrastructure such as Redis.
- Jobs, phase results and run state live in one database, which keeps them consistent.
- Throughput is lower than a dedicated broker, which is fine for a single-user tool.
- The worker can be split into its own service later with a second entry point.
- A phase status change and its job are written in the same transaction, so a crash cannot leave a phase marked running without a job, or a job without its phase.

## Scaling path

> [!TIP]
> **Further scaling: BullMQ + Redis.** If the job volume ever outgrows Postgres, the queue can move to BullMQ on Redis by adding a `BullMqQueue` that implements the same `JobQueue` interface and wiring it in `server.ts`. Phases, the phase runner and the services do not change. Two things come with that move: a Redis service in Docker Compose, and an outbox table, because a database update and a Redis job can no longer be written in one transaction.
