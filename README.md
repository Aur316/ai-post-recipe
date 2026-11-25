# AI Post Recipe

AI Post Recipe turns an Instagram brand brief into three ready-to-publish posts through a repeatable, phase-based recipe. You describe a brand (profile, website, products, audience, goals) and upload screenshots, product photos and a logo. The app then researches the brand from official sources, analyses its voice and visuals, plans three posts, writes the copy, renders the slides and checks the result.

Every phase runs as a background job and stores its output in PostgreSQL, so a run can be paused, resumed or re-run from any finished phase. After the brand analysis and the content plan the run stops and waits for a person to approve or edit the result. The final export is a ZIP with the images, captions, sources and every intermediate result.

> **Status:** milestones M1–M3 done. You can create a run from a brand brief with reference uploads and see it in the list. See [the milestones](docs/milestones/README.md) for what comes next.

## Prerequisites

| Tool    | Version         | Notes                                                    |
| ------- | --------------- | -------------------------------------------------------- |
| Node.js | 24              | Only needed for local development                        |
| pnpm    | 10              | Enable it with `corepack enable`                         |
| Docker  | with Compose v2 | Runs PostgreSQL, and the whole app in the `full` profile |

## Quick start (Docker only)

Runs the full stack from built images. You do not need Node.js for this.

```bash
cp .env.example .env
docker compose --profile full up --build
```

Open http://localhost:8080. The web app shows the API status.

Stop the stack with `docker compose --profile full down`. Add `-v` to also delete the database volume.

## Local development

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm dev` starts PostgreSQL in Docker (and waits until it is healthy), then runs both apps with hot reload:

| App           | URL                              |
| ------------- | -------------------------------- |
| Web (Vite)    | http://localhost:5173            |
| API (Express) | http://localhost:3000/api/health |

The Vite dev server proxies `/api` requests to the API, so the browser only talks to port 5173.

## Scripts

Run these from the repository root. Turborepo runs each one in every workspace that defines it.

| Command          | What it does                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`       | Starts the database, then the API and the web app in watch mode                                              |
| `pnpm build`     | Builds all apps                                                                                              |
| `pnpm typecheck` | Type-checks all packages                                                                                     |
| `pnpm lint`      | Lints all packages with ESLint                                                                               |
| `pnpm test`      | Runs all tests with Vitest                                                                                   |
| `pnpm format`    | Formats every file with Prettier (`format:check` only checks)                                                |
| `pnpm seed`      | Adds 30 draft runs to the development database (`pnpm seed 50` for another number); re-running replaces them |

## Configuration

Copy `.env.example` to `.env`. API keys are never committed and never reach the browser.

| Variable       | Default                                      | Purpose                                                                                |
| -------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`         | `3000`                                       | API port                                                                               |
| `DATABASE_URL` | `postgresql://app:app@localhost:5432/recipe` | PostgreSQL connection string. Compose overrides the host to `db` in the `full` profile |

The `S3_*` variables configure object storage: SeaweedFS from Docker Compose by default, or Cloudflare R2. Later milestones add the OpenRouter and Serper API keys, the model overrides and a cost cap per run. See [Development and deployment](docs/architecture/10-development-and-deployment.md).

## Project structure

```
apps/
  api/        Express API (later: job worker and slide renderer)
  web/        React single-page app
packages/
  shared/         Zod schemas and types shared by the API and the web app
  tsconfig/       Shared TypeScript settings
  eslint-config/  Shared ESLint rules
docker/       Dockerfiles and the nginx config for the web image
docs/
  architecture/   How the app is designed, plus decision records
  milestones/     Build plan: requirements, user stories and tasks per milestone
docker-compose.yml
turbo.json
```

## Security note

The app has no login and is meant to run locally for one person. Do not expose it publicly as it is: a public deployment needs authentication and rate limiting per user.

## Documentation

- [Architecture](docs/architecture/README.md): system design, the generation pipeline, data model, API and decision records.
- [Milestones](docs/milestones/README.md): the build plan from scaffold to delivery.
