# M9 · Delivery

**Goal:** the project is ready to hand in: it starts with one command on a clean machine, the recipe is documented, and the PDF is written.

**Status:** Not started

## Requirements

FR-18, NFR-01, NFR-08

## User stories

**US-9.1** As a **reviewer**, I want to run the app on a clean machine with my own key, so that I can reproduce the posts.

- On a clean clone, copying `.env.example` to `.env`, setting the key and running `docker compose --profile full up --build` is enough.
- The README explains the steps and the required keys.

**US-9.2** As a **reviewer**, I want a readable recipe, so that I understand the method without reading the code.

- `docs/recipe.md` follows the structure the task asks for:
  - **Starting command:** the exact commands from a clean clone to a finished run.
  - **Tools and models:** every model per phase (text, vision, image) with its settings (temperature, size), plus Serper and Playwright.
  - **Inputs and references:** the Instagram profile, the brief answers, the uploaded screenshots, product photos and logo, all in `examples/gymbeam`.
  - **Phases:** for each phase its input, what it does, its output, and the prompt file and version.
  - **Human steps:** what the operator does at each approval gate, and the edits made in the demo run.
  - **What may vary:** text and pixels differ between runs; brand identity, facts and goals must not.
- The recipe does not depend on any conversation or unexplained manual edit: every human change is stored in `editedOutput` and exported with the run.

**US-9.3** As a **reviewer**, I want a short report, so that I can see the results and how they were evaluated.

- `docs/report.pdf` is 1–2 pages: the recipe in brief, time and cost per phase, models and prompt versions, an example of the author's own correction, and a learning proposal.

## Tasks

- [ ] `full` Compose profile tested on a clean clone (including storage and the Playwright image)
- [ ] README: final start instructions, keys, costs and the security note
- [ ] `docs/recipe.md` with the sections listed in US-9.2
- [ ] Export the demo run's approval edits (`output` vs. `editedOutput`) into `examples/gymbeam` so the human steps are visible
- [ ] Export the per-phase time, cost, models and prompt versions from `PhaseRun` for the report
- [ ] `docs/report.pdf`
- [ ] CI: push the `api` and `web` images to GHCR with `latest` and the commit SHA
- [ ] Final pass over the architecture docs: remove resolved **Current state** notes

## Exit criteria

- A person who has never seen the project reproduces the posts from the README alone.
