# 01 · Overview

AI Post Recipe is a React and Express application that turns an Instagram brand brief into three finished posts. It runs the work in phases, asks a person to approve the key decisions, and saves every intermediate result so a run can be resumed after an interruption.

## Problem and deliverables

The project answers a take-home brief that asks for three outputs:

1. **Three finished Instagram posts** for a chosen brand.
2. **A repeatable, phase-based recipe** that produced them.
3. **A 1–2 page PDF** describing the recipe and evaluating it.

The application is the recipe. A reviewer can clone the repository, run `docker compose --profile full up` with their own API key and reproduce the posts.

## Goals

- **Repeatable:** the same brief and the same prompt versions give a comparable result, and every run records which prompts and models it used.
- **Grounded:** facts come only from official pages that were actually downloaded, each with a source link. Every claim is marked `verified` or `assumption`.
- **Human in the loop:** the run pauses after the brand analysis and after the content plan. A person approves or edits the AI proposal before the run continues.
- **Resumable:** each phase is saved. A failed or edited phase can be re-run without starting over.
- **Accurate visuals:** logos, product photos and text on slides come from real files, never from an image model.
- **Easy to run:** one command for reviewers, one command for developers.

## Non-goals

| Not in scope              | Why                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Login and user management | Single-user tool, run locally. The README must state that a public deployment needs it.                                               |
| Instagram scraping        | The user uploads screenshots of the profile and posts instead. See [ADR 0006](adr/0006-screenshots-instead-of-instagram-scraping.md). |
| Automatic publishing      | The posts are delivered as files. Nothing is posted to Instagram.                                                                     |
| Video and reels           | Only if time allows: a simple slideshow reel from story images with ffmpeg.                                                           |

## Technology choices

| Area            | Choice                                                | Reason                                                                                                                                              |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo        | Turborepo, pnpm workspaces                            | Shared types and Zod schemas between frontend and backend; one command starts everything ([ADR 0001](adr/0001-monorepo-with-turborepo-and-pnpm.md)) |
| Frontend        | React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui | Fast development, consistent UI                                                                                                                     |
| Server state    | TanStack Query                                        | Polling for running phases, caching, retries                                                                                                        |
| Forms           | React Hook Form with the Zod resolver                 | The brief form validates with the same schema as the backend                                                                                        |
| Backend         | Node.js, Express, TypeScript                          | Layered structure with clear boundaries                                                                                                             |
| Database        | PostgreSQL 16 with Prisma                             | Stores runs, phases and intermediate results                                                                                                        |
| Background jobs | pg-boss                                               | Postgres-based queue, so no Redis; long AI calls do not block HTTP requests ([ADR 0002](adr/0002-postgres-job-queue-with-pg-boss.md))               |
| LLM and images  | OpenRouter (text, vision and image models)            | Model-agnostic; the model is configurable per phase ([ADR 0003](adr/0003-openrouter-as-model-gateway.md))                                           |
| Search          | Serper API (optional)                                 | Finds official pages, product pages and articles. Without a key the run uses the links given in the brief                                           |
| File storage    | S3-compatible object storage                          | Uploads and generated images; any S3 service in production                                                                                          |
| Slide rendering | React templates rendered to PNG by Playwright         | Text, logo and product photo stay exact; AI only supplies backgrounds ([ADR 0004](adr/0004-render-slides-from-react-templates.md))                  |
| Tests           | Vitest, Supertest, Testing Library                    | Fast and TypeScript-native                                                                                                                          |
| CI              | GitHub Actions                                        | Lint, type check, tests and build on every push                                                                                                     |
| Authentication  | None                                                  | See non-goals ([ADR 0007](adr/0007-no-authentication-in-mvp.md))                                                                                    |

## Guiding principles

1. **One phase, one job.** Each phase runs as its own background job and writes its result to the `PhaseRun` table. Any phase can be re-run, and a run can continue from any saved phase.
2. **Stop for a human where judgement matters.** The two approval gates are where the AI proposal can be corrected. The difference between the AI output and the edited version is kept and becomes the "own correction" example the PDF asks for ([ADR 0005](adr/0005-human-approval-gates.md)).
3. **Prompts are versioned files.** Prompts live in `packages/prompts`, not scattered in code. The recipe can be read and handed in without reading the code.
4. **A search snippet is not a fact.** Only text from downloaded official pages counts, always with its source link.
5. **Validate at every boundary.** Every request, response and LLM output is checked against a Zod schema.
