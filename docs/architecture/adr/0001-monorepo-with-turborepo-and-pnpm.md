# 0001 · Monorepo with Turborepo and pnpm workspaces

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The frontend and the backend share request and response schemas, domain enums, prompts and slide templates. Reviewers must be able to start everything with one command.

## Decision

Use one repository with pnpm workspaces (`apps/*`, `packages/*`) and Turborepo as the task runner. Shared Zod schemas live in `packages/shared`.

## Consequences

- A contract change breaks the type check on both sides at once.
- One `pnpm dev` and one `pnpm build` cover every workspace, with caching.
- Docker builds must copy the workspace and filter to the target app.
- pnpm is pinned through the `packageManager` field (currently pnpm 10, because the Corepack bundled with Node 24 cannot run pnpm 12 yet).
