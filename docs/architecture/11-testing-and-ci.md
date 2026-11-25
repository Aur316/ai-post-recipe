# 11 · Testing and CI/CD

Tests never call the real OpenRouter or Serper API, so they run without keys, for free and deterministically. A separate, manually started `pnpm test:live` runs one full recipe with a real key; it never runs in CI.

## Test layers

| Layer      | Tools                    | What it tests                                                                  | External dependencies                                               |
| ---------- | ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Unit (api) | Vitest                   | Service and phase logic, the state machine, Zod validation, grounding rules    | All providers mocked (`FakeLlmProvider` returns recorded JSON)      |
| API (api)  | Vitest + Supertest       | Endpoints, status codes, errors, state transitions (for example approve → 409) | Real PostgreSQL (a service container in CI); LLM and storage mocked |
| Unit (web) | Vitest + Testing Library | Brief form validation, the approval panel, hooks                               | MSW for the network                                                 |
| Renderer   | Vitest + Playwright      | A template renders at the expected size and shows the logo                     | Local files                                                         |

## Code style

- **ESLint** with type-aware `typescript-eslint` rules, shared from `packages/eslint-config`. The web app adds the React Hooks rules and forbids relative imports (use the `@/` alias).
- **Prettier** formats everything: single quotes, no semicolons, sorted imports, sorted Tailwind classes.
- TypeScript stays on 6.0 because `typescript-eslint` does not support TypeScript 7 yet.
- `.vscode/settings.json` formats on save and applies ESLint fixes.

## CI pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request:

```mermaid
flowchart LR
  a[Checkout<br/>pnpm, Node 24, Turbo cache] --> b[pnpm install<br/>--frozen-lockfile]
  b --> c[pnpm lint]
  c --> d[pnpm typecheck]
  d --> e[prisma migrate deploy<br/>pnpm test]
  e --> f[pnpm build]
  f --> g[Docker build<br/>api, web]
```

1. Check out, set up pnpm and Node 24, restore the Turborepo cache.
2. `pnpm install --frozen-lockfile`.
3. `pnpm lint` (ESLint) and `pnpm format:check` (Prettier). A failure stops the pipeline.
4. `pnpm typecheck`.
5. `prisma migrate deploy` against the PostgreSQL service container, then `pnpm test` (unit and API).
6. `pnpm build`.
7. Build the `api` and `web` Docker images, so the Dockerfiles are checked too.

The `main` branch is protected: merging requires a green pipeline.

> **Current state:** CI runs everything except step 5's `prisma migrate deploy`; the PostgreSQL service container and migrations join in M2.

## CD

After a commit lands on `main`, the workflow pushes both images to the GitHub Container Registry (GHCR) with the `latest` tag and the commit SHA.
