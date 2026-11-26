# M9 · Delivery

**Goal:** the project is ready to hand in, with exactly what the task asks for: the recipe is documented so it can be repeated, and the short PDF is written.

**Status:** Done

## Requirements

FR-18, NFR-01

## User stories

**US-9.1** As a **reviewer**, I want to run the app on a clean machine with my own key, so that I can reproduce the posts.

- On a clean clone, copying `.env.example` to `.env`, setting the key and running `docker compose --profile full up --build` is enough.
- The README explains the steps and the required keys, and `.env.example` holds no secrets.

**US-9.2** As a **reviewer**, I want a readable recipe, so that I understand the method without reading the code.

- `docs/recipe.md` covers:
  - **Starting command:** the exact commands from a clean clone to a finished run.
  - **Tools and models:** every model per phase (text, vision, image) with its settings, plus Serper and Playwright.
  - **Inputs and references:** the Instagram profile, the brief answers, the uploaded screenshots, product photos and logo, all in `examples/gymbeam` (and `examples/franck` as a second brand).
  - **Phases:** for each phase its input, what it does, its output, and the prompt file and version.
  - **Human steps:** what the operator does at each approval gate.
  - **What may vary:** text and pixels differ between runs; brand identity, facts and goals must not.
- The recipe does not depend on any conversation or unexplained manual edit: every human change is stored in `editedOutput` and exported with the run.

**US-9.3** As a **reviewer**, I want a short report, so that I can see how to run the recipe and how it was evaluated.

- `docs/report.pdf` is 1–2 pages: how to run and configure it, the phases, key decisions, how the results were checked and the limits, the time spent (work separate from waiting for generation), one concrete example of the author's own correction of an AI proposal (the visuals change from `background@v5` to `v6`), and a proposal for improving the recipe, including how it could learn from comments, approvals and the results of earlier posts.

## Tasks

- [x] `docs/recipe.md` with the sections listed in US-9.2
- [x] `docs/report.pdf` (source: `docs/report/report.html`)
- [x] README: final start instructions, keys, costs, links to the recipe, the report and the examples
- [x] Start from a clean clone with `docker compose --profile full up --build`

## Exit criteria

- A person who has never seen the project reproduces the posts from the README and the recipe alone.
