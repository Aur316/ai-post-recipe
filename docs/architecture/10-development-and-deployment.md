# 10 · Development and deployment

There are two ways to start the app, each with one command:

| Command                                    | Starts                                                                                                                   | For         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `pnpm dev`                                 | The `db` and `storage` containers if they are not running, applies migrations, then runs `web` and `api` with hot reload | Development |
| `docker compose --profile full up --build` | All containers from built images                                                                                         | Reviewers   |

## How `pnpm dev` starts the database

The root `package.json` has a `predev` script that runs before `dev`:

```json
{
  "scripts": {
    "predev": "docker compose up -d --wait db storage && pnpm --filter api db:deploy",
    "dev": "turbo run dev"
  }
}
```

`--wait` blocks until the health checks pass, so the API starts only when PostgreSQL accepts connections.

## Docker Compose

| Service   | Image                      | Profile | Notes                                                                                                                                |
| --------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `db`      | `postgres:16-alpine`       | always  | Health check with `pg_isready`; data in the `db-data` volume                                                                         |
| `storage` | `chrislusf/seaweedfs:4.55` | always  | S3 gateway on port 8333; health check on `/healthz`; data in the `storage-data` volume                                               |
| `api`     | `docker/api.Dockerfile`    | `full`  | Runs `prisma migrate deploy`, then starts; reads `.env`; Compose overrides `DATABASE_URL` and `S3_ENDPOINT` to use the service names |
| `web`     | `docker/web.Dockerfile`    | `full`  | nginx serves the SPA on port 8080 and proxies `/api/` to `api:3000`                                                                  |

In the `full` profile the API reaches the other containers by service name, so Compose sets `DATABASE_URL=postgresql://app:app@db:5432/recipe` and `S3_ENDPOINT=http://storage:8333`. The API container applies migrations at startup and has a health check on `/api/health`; `web` waits for it.

## Images

| Image | Build                                                                         | Runtime                                                                                                     |
| ----- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `api` | Multi-stage: install with a frozen lockfile, build, then `pnpm deploy --prod` | Only production dependencies and `dist/`. Switches to the Playwright base image in M7 for headless Chromium |
| `web` | Multi-stage: install and `vite build`                                         | `nginx:alpine` with the static files and `docker/nginx.conf`                                                |

## Configuration

`.env.example` lists every variable without secrets. Copy it to `.env`.

| Variable                                                                  | Milestone | Purpose                                             |
| ------------------------------------------------------------------------- | --------- | --------------------------------------------------- |
| `PORT`                                                                    | M1        | API port (default 3000)                             |
| `DATABASE_URL`                                                            | M1        | PostgreSQL connection string                        |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | M2        | Object storage: SeaweedFS locally, R2 in production |
| `OPENROUTER_API_KEY`                                                      | M5        | Required for every AI call                          |
| `SERPER_API_KEY`                                                          | M5        | Optional web search                                 |
| `MODEL_TEXT`, `MODEL_VISION`, `MODEL_IMAGE`                               | M5        | Override the model set in the prompt files          |
| `MAX_COST_USD_PER_RUN`                                                    | M5        | Cost cap per run (default 3)                        |

The API validates its environment with Zod at startup and exits with a clear message if something is missing.

## Demo data

`pnpm seed` (`apps/api/prisma/seed.ts`) currently adds draft runs named “Seed brand NN” for trying the runs list and its pagination; re-running replaces them and leaves other runs alone.

In M8 the same command will also load the GymBeam demo brief and reference images from `examples/gymbeam`, so a reviewer can start the recipe without filling in the form.

## Deployment

No production deployment is needed for this project. CI publishes both images to the GitHub Container Registry ([Testing and CI/CD](11-testing-and-ci.md)). If a server is added later, `docker compose pull && docker compose up -d` is enough. A public deployment would first need authentication ([ADR 0007](adr/0007-no-authentication-in-mvp.md)).

## Using Cloudflare R2

Set these in `.env` (or in the hosting platform) instead of the SeaweedFS defaults; no code change is needed ([ADR 0008](adr/0008-seaweedfs-locally-r2-in-production.md)):

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=ai-post-recipe
S3_ACCESS_KEY=<R2 API token access key>
S3_SECRET_KEY=<R2 API token secret>
```

The API creates the bucket at startup if the token is allowed to; otherwise create it in the Cloudflare dashboard first.
