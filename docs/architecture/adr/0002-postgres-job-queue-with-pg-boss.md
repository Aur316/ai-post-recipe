# 0002 · Background jobs with pg-boss on PostgreSQL

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

LLM and image calls take from seconds to minutes. They must not block HTTP requests, must survive a restart, and must be retried on failure. The project already needs PostgreSQL.

## Decision

Run each phase as a pg-boss job. pg-boss stores its jobs in its own `pgboss` schema in the same database. The worker starts inside the API process.

## Consequences

- No extra infrastructure such as Redis.
- Jobs, phase results and run state live in one database, which keeps them consistent.
- Throughput is lower than a dedicated broker, which is fine for a single-user tool.
- The worker can be split into its own service later with a second entry point.
