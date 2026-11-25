# M5 · Research and analysis

**Goal:** the research phase collects real official sources, and the brand analysis is produced by a real model with every claim labelled and linked.

**Status:** Not started

## Requirements

FR-08, FR-09, NFR-03, NFR-05, NFR-06, NFR-10, NFR-12

## User stories

**US-5.1** As an **operator**, I want the app to find and read the brand's official pages, so that the posts are based on facts.

- With a Serper key, the research phase finds official, product and article pages.
- Without a key, it uses only the links from the brief.
- Each source stores URL, title, excerpt, fetch time and whether it was reachable.

**US-5.2** As an **operator**, I want every claim in the analysis marked as verified or assumption, so that I know what to trust.

- Every claim is either `verified` with a source URL, or `assumption`.
- The analysis view shows the label and the source link for each claim.

**US-5.3** As a **reviewer**, I want to see which prompt and model produced each result and what it cost, so that the recipe is traceable.

- Each phase shows prompt id, model, tokens, cost and duration.
- The run stops with a clear message before it exceeds `MAX_COST_USD_PER_RUN`.

## Tasks

**Providers**

- [ ] `LlmProvider` and `OpenRouterProvider`: text and vision, structured output, timeout, backoff, usage and cost
- [ ] `SearchProvider`: `SerperProvider` and `NoopSearchProvider`
- [ ] Fetcher: download with a timeout, respect `robots.txt`, HTML to clean text
- [ ] `OPENROUTER_API_KEY`, `SERPER_API_KEY`, `MODEL_*` and `MAX_COST_USD_PER_RUN` in `config/env.ts` and `.env.example`

**Prompts**

- [ ] `packages/prompts`: markdown files with front matter (id, version, model, temperature)
- [ ] Prompt loader with `.env` model overrides
- [ ] Research and analysis prompts

**Phases**

- [ ] Research phase: search, fetch, save `Source` rows
- [ ] Analysis phase: vision model over screenshots and source text; Zod schema with `verified` / `assumption`
- [ ] One retry with the validation error on invalid output
- [ ] Cost cap check in the phase runner

**Web**

- [ ] `BrandAnalysisView` with labels and source links, editable in the approval panel
- [ ] Sources list on the run detail page
- [ ] Prompt, model, tokens and cost on each phase card

**Tests**

- [ ] Fetcher tests with recorded HTML
- [ ] Analysis output schema tests, including the retry path
- [ ] `pnpm test:live` script for one real run (not in CI)

## Exit criteria

- A real run reaches the analysis approval with real sources and labelled claims.

## Risks

| Risk | Mitigation |
| --- | --- |
| Sites block automated fetching | Record the source as unreachable and continue; the brief's links remain |
| The model invents facts | Schema requires a source URL for `verified`; the review phase flags unsourced claims |
