# Requirements

The requirements below come from the project brief and the [architecture](../architecture/README.md). The last column shows the milestone that delivers each one.

## Functional requirements

| ID    | Requirement                                                                                                                                                                                               | Milestone |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| FR-01 | The operator can create a run from a brief: brand name, Instagram URL, reason for the choice, links, products, audience, goals, inspiration, output language                                              | M3        |
| FR-02 | The operator can upload Instagram screenshots, product photos, a logo and other references to a run                                                                                                       | M2, M3    |
| FR-03 | The operator can list earlier runs and open any of them                                                                                                                                                   | M3        |
| FR-04 | The system runs the recipe as eight phases, each as a background job with its output saved                                                                                                                | M4        |
| FR-05 | The run pauses after the brand analysis and after the content plan until the operator approves                                                                                                            | M4, M6    |
| FR-06 | At approval the operator can edit the AI proposal; the original and the edited version are both kept                                                                                                      | M4, M6    |
| FR-07 | The operator can re-run any finished or failed phase; later phases become stale                                                                                                                           | M4        |
| FR-08 | The research phase finds and downloads official pages; without a search key it uses the brief's links                                                                                                     | M5        |
| FR-09 | The brand analysis labels every claim `verified` with a source link, or `assumption`                                                                                                                      | M5        |
| FR-10 | The content plan proposes three posts with goal, format, concept, rationale and product                                                                                                                   | M6        |
| FR-11 | The copy phase writes caption, hashtags and slide text in Croatian or English using only sourced facts                                                                                                    | M6        |
| FR-12 | The visuals phase renders slides at 1080×1350 or 1080×1920 with the real logo, product photo and text                                                                                                     | M7        |
| FR-13 | The operator can preview the slides and regenerate a single slide with an instruction                                                                                                                     | M7        |
| FR-14 | The review phase checks logo and product visibility, readability, sources and size, and sends failing slides back                                                                                         | M8        |
| FR-15 | The operator can download a ZIP with images, captions, metadata, sources and all intermediate results                                                                                                     | M8        |
| FR-16 | A reviewer can load a demo brief without filling in the form                                                                                                                                              | M8        |
| FR-17 | No copy, slide or caption attributes a statement or quote to a real person, unless it is quoted from a source with its link                                                                               | M6, M8    |
| FR-18 | `docs/recipe.md` lets someone repeat the recipe without any other conversation: starting command, tools and models with settings, inputs and references, every human step, and what may vary between runs | M9        |

## Non-functional requirements

| ID     | Requirement                                                                                           | Milestone |
| ------ | ----------------------------------------------------------------------------------------------------- | --------- |
| NFR-01 | One command starts the full app for reviewers: `docker compose --profile full up --build`             | M1, M9    |
| NFR-02 | One command starts the development environment with hot reload: `pnpm dev`                            | M1        |
| NFR-03 | API keys stay in the API container and never reach the browser or the repository                      | M1, M5    |
| NFR-04 | Every request, response and LLM output is validated with a shared Zod schema                          | M2–M6     |
| NFR-05 | Every phase records prompt id, model, token counts, cost and duration                                 | M4, M5    |
| NFR-06 | A run stops before it exceeds `MAX_COST_USD_PER_RUN`                                                  | M5        |
| NFR-07 | Tests run without API keys and never call real external services                                      | M1–M8     |
| NFR-08 | CI runs lint, type check, tests, build and Docker builds on every push; `main` needs a green pipeline | M1        |
| NFR-09 | Uploads are limited by MIME type and to 10 MB per file                                                | M2        |
| NFR-10 | Web pages are fetched with a timeout, and `robots.txt` is respected                                   | M5        |
| NFR-11 | Errors use one response shape, and illegal state changes return `409 Conflict`                        | M2, M4    |
| NFR-12 | Prompts are versioned files readable without the code                                                 | M5        |
