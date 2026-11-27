# AI Post Recipe

AI Post Recipe turns an Instagram brand brief into three ready-to-publish posts through a repeatable, phase-based recipe. You describe a brand (profile, website, products, audience, goals) and upload screenshots, product photos and a logo. The app then researches the brand from official sources, analyses its voice and visuals, plans three posts, writes the copy, renders the slides and checks the result.

Every phase runs as a background job and stores its output in PostgreSQL, so a run can be paused, resumed or re-run from any finished phase. After the brand analysis and the content plan the run stops and waits for a person to approve or edit the result. The final export is a ZIP with the images, captions, sources and every intermediate result.

> **Results:** the three finished GymBeam Hrvatska posts are in [`examples/gymbeam/generated-posts`](examples/gymbeam/generated-posts), with every input in [`examples/gymbeam`](examples/gymbeam). The same recipe made the posts for a second brand in [`examples/franck`](examples/franck). How to repeat it: [the recipe](docs/recipe.md). Instructions and review: [the report](docs/report.pdf).

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

Open http://localhost:8080. Set `OPENROUTER_API_KEY` in `.env` first (see [Configuration](#configuration)); without it the app runs in demo mode with recorded sample answers. To repeat the GymBeam run, follow [the recipe](docs/recipe.md). A run costs about $1 of OpenRouter credit; image generation needs at least $1 of balance on the account.

Stop the stack with `docker compose --profile full down`. Add `-v` to also delete the database volume.

## Local development

```bash
corepack enable
pnpm install
pnpm dev
```

`pnpm install` creates `.env` from `.env.example` when it does not exist yet. When `.env.example` gains a variable later, the next `pnpm install` adds it to your `.env` with the example value and says so; values you have set are never changed.

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
| `pnpm seed:demo` | Creates the GymBeam demo run from `examples/gymbeam` (brief and reference images); start it in the app       |

## Configuration

`pnpm install` creates `.env` from `.env.example` (see [Local development](#local-development)); for the Docker-only quick start, copy it by hand. API keys are never committed and never reach the browser. **Where to get the keys and how to add them: [docs/onboarding.md](docs/onboarding.md)** (the same steps are on the app's Setup page, linked from the demo-mode banner).

| Variable               | Default                                      | Purpose                                                                                                                        |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                 | `3000`                                       | API port                                                                                                                       |
| `DATABASE_URL`         | `postgresql://app:app@localhost:5432/recipe` | PostgreSQL connection string. Compose overrides the host to `db` in the `full` profile                                         |
| `OPENROUTER_API_KEY`   | (empty)                                      | Key from [openrouter.ai/keys](https://openrouter.ai/keys). Without it the AI phases return recorded sample answers (demo mode) |
| `SERPER_API_KEY`       | (empty)                                      | Optional key from [serper.dev](https://serper.dev). Without it research reads only the links in the brief                      |
| `MAX_COST_USD_PER_RUN` | `2` (`3` in `.env.example`)                  | No LLM call starts once a run has spent this much                                                                              |
| `MODEL_<PROMPT ID>`    | (from the prompt file)                       | Overrides a prompt's model, e.g. `MODEL_ANALYSIS=google/gemini-3.5-flash`                                                      |
| `LLM_TIMEOUT_MS`       | `120000`                                     | Timeout of one model request                                                                                                   |

The `S3_*` variables configure object storage: SeaweedFS from Docker Compose by default, or Cloudflare R2. See [Development and deployment](docs/architecture/10-development-and-deployment.md).

## Project structure

```
apps/
  api/        Express API, job worker and slide renderer
  web/        React single-page app
packages/
  shared/         Zod schemas and types shared by the API and the web app
  prompts/        The prompts of the recipe, as Markdown files with front matter
  slide-templates/ The Instagram slide template (React), rendered to PNG by the API
  tsconfig/       Shared TypeScript settings
  eslint-config/  Shared ESLint rules
examples/     Demo briefs, reference images and the finished posts (GymBeam, Franck)
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

- [Recipe](docs/recipe.md): how to repeat the GymBeam run: commands, models and settings, inputs, phases, human steps and what may vary.
- [Report](docs/report.pdf): the short PDF with instructions, decisions, checks, limits and proposals.
- [Architecture](docs/architecture/README.md): system design, the generation pipeline, data model, API and decision records.
- [Milestones](docs/milestones/README.md): the build plan from scaffold to delivery.

## License

All rights reserved; free to view and run for non-commercial use. See [LICENSE](LICENSE).
