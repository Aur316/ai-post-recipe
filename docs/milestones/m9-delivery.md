# M9 · Delivery

**Goal:** the project is ready to hand in: it starts with one command on a clean machine, the recipe is documented, and the PDF is written.

**Status:** Not started

## Requirements

NFR-01, NFR-08

## User stories

**US-9.1** As a **reviewer**, I want to run the app on a clean machine with my own key, so that I can reproduce the posts.

- On a clean clone, copying `.env.example` to `.env`, setting the key and running `docker compose --profile full up --build` is enough.
- The README explains the steps and the required keys.

**US-9.2** As a **reviewer**, I want a readable recipe, so that I understand the method without reading the code.

- `docs/recipe.md` describes every phase, its prompt, its inputs and the human steps.

**US-9.3** As a **reviewer**, I want a short report, so that I can see the results and how they were evaluated.

- `docs/report.pdf` is 1–2 pages: the recipe in brief, time and cost per phase, models and prompt versions, an example of the author's own correction, and a learning proposal.

## Tasks

- [ ] `full` Compose profile tested on a clean clone (including storage and the Playwright image)
- [ ] README: final start instructions, keys, costs and the security note
- [ ] `docs/recipe.md`
- [ ] Export the per-phase time, cost, models and prompt versions from `PhaseRun` for the report
- [ ] `docs/report.pdf`
- [ ] CI: push the `api` and `web` images to GHCR with `latest` and the commit SHA
- [ ] Final pass over the architecture docs: remove resolved **Current state** notes

## Exit criteria

- A person who has never seen the project reproduces the posts from the README alone.
