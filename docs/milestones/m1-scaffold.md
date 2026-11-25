# M1 · Scaffold

**Goal:** an empty but complete monorepo that starts with one command, has the tooling every later milestone relies on, and is checked by CI.

**Status:** Done

## Requirements

[NFR-01](requirements.md#non-functional-requirements), NFR-02, NFR-03, NFR-07, NFR-08

## User stories

**US-1.1** As a **reviewer**, I want to start the whole app with one Docker command, so that I do not have to install Node.js or configure anything.

- [x] `cp .env.example .env && docker compose --profile full up --build` starts `db`, `api` and `web`.
- [x] http://localhost:8080 shows the app and the API status through the nginx proxy.

**US-1.2** As a **developer**, I want `pnpm dev` to start the database and both apps with hot reload, so that I can work without manual setup.

- [x] `pnpm dev` starts PostgreSQL and waits until it is healthy.
- [x] The API runs on port 3000 and the web app on port 5173, with `/api` proxied.

**US-1.3** As a **developer**, I want shared lint, format, type and test tooling, so that every package follows the same rules.

- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` run in every workspace through Turborepo.
- [x] At least one test exists in each app and passes.

**US-1.4** As a **developer**, I want CI to check every push, so that `main` always builds.

- [ ] A pull request with a lint, type or test error fails CI.
- [x] Both Docker images are built in CI.

## Tasks

**Monorepo and apps**

- [x] pnpm workspace and Turborepo with `dev`, `build`, `typecheck` and `lint` tasks
- [x] `apps/api`: Express 5 and TypeScript, `app.ts` separate from `server.ts`, `GET /api/health`
- [x] `apps/web`: React 19 and Vite, `/api` proxy to the API
- [x] `packages/tsconfig` with the shared base config, used by both apps
- [x] `packages/shared` with Zod and a first shared schema (the health response)
- [x] `apps/api/src/config/env.ts`: validate environment variables with Zod at startup
- [x] Tailwind CSS 4 and `shadcn/ui` initialised in `apps/web`

**Tooling**

- [x] `packages/eslint-config` with type-aware ESLint rules; Prettier with sorted imports and Tailwind classes; replace the template's oxlint setup
- [x] `.vscode/settings.json`: format on save, ESLint fixes on save
- [x] Vitest in both apps; Supertest test for `GET /api/health`; Testing Library test for `App`
- [x] `test` task in `turbo.json`

**Docker**

- [x] `docker-compose.yml` with `db` (PostgreSQL 16 and a health check) and `api` and `web` in the `full` profile
- [x] `docker/api.Dockerfile` (multi-stage, production dependencies only)
- [x] `docker/web.Dockerfile` and `docker/nginx.conf`
- [x] `predev` script that starts the database and waits for it

**CI and docs**

- [x] `.github/workflows/ci.yml`: install, lint, format check, type check, test, build, Docker build
- [x] Branch protection on `main` requiring a green pipeline
- [x] README with start instructions
- [x] Architecture and milestone documentation

## Exit criteria

- Both start commands work on a clean clone.
- CI is green on `main`.

## Notes

- TypeScript is pinned to 6.0, because `typescript-eslint` does not support TypeScript 7 yet.
- pnpm is pinned to version 10, because the Corepack bundled with Node 24 cannot run pnpm 12 yet.
- Object storage joins Compose in M2, the Playwright base image in M7.
