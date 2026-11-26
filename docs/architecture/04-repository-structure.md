# 04 · Repository structure

The repository is a Turborepo monorepo with pnpm workspaces. Shared Zod schemas and types live in `packages/shared`, and both apps import them from there, so the API contract is defined in one place.

```
ai-post-recipe/
├─ apps/
│  ├─ web/                  # React + Vite SPA
│  └─ api/                  # Express API + pg-boss worker + slide renderer
├─ packages/
│  ├─ shared/               # Zod schemas, DTOs, enums (PhaseKey, RunStatus)
│  ├─ prompts/              # Versioned prompts per phase (.md with front matter: model, temperature)
│  ├─ slide-templates/      # React slide templates (carousel, image, story) driven by brand tokens
│  ├─ eslint-config/
│  └─ tsconfig/
├─ docker/
│  ├─ api.Dockerfile
│  ├─ web.Dockerfile        # build, then serve with nginx
│  └─ nginx.conf
├─ docs/
│  ├─ architecture/         # this documentation
│  ├─ milestones/           # build plan
│  ├─ recipe.md             # the recipe to hand in: phases, prompts, human steps
│  └─ report.pdf            # the 1–2 page guide and evaluation
├─ examples/gymbeam/        # demo brief, reference uploads, the three finished posts
├─ .github/workflows/ci.yml
├─ docker-compose.yml       # db + storage, plus api and web in the "full" profile
├─ .env.example
├─ turbo.json
└─ package.json
```

## Why separate packages

| Package                     | Reason                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `shared`                    | One source of truth for request, response and domain schemas. A contract change breaks the type check on both sides.                |
| `prompts`                   | Reviewers can read the recipe without reading the code, and every prompt has a version recorded on each `PhaseRun`.                 |
| `slide-templates`           | The same component renders the preview in the browser and the PNG in the renderer, so what the user approves is what gets exported. |
| `eslint-config`, `tsconfig` | Shared tooling settings, so the apps stay consistent.                                                                               |

## Dependency rules

- `apps/*` may depend on `packages/*`. Packages never depend on apps.
- `packages/shared` has no runtime dependency other than Zod.
- `apps/web` must never import server-only code such as providers or Prisma.

> **Current state:** `packages/shared`, `packages/prompts`, `packages/tsconfig` and `packages/eslint-config` exist. `slide-templates` is added in M7 (see [milestones](../milestones/README.md)).
