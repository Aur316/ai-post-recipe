# The recipe

This document describes the recipe that produced the three GymBeam Hrvatska posts in [`examples/gymbeam/generated-posts`](../examples/gymbeam/generated-posts), and how to repeat it. It needs no other conversation: every input is in the repository, every prompt is a versioned file, and every human change is stored with the run and exported.

The same recipe, with no changes, also made the posts for a second brand, Franck: [`examples/franck`](../examples/franck).

## Starting command

From a clean clone, with Docker:

```bash
cp .env.example .env
# set OPENROUTER_API_KEY (required) and SERPER_API_KEY (optional) in .env
docker compose --profile full up --build
```

Open http://localhost:8080 and create a new run: fill in the form with the answers from [`examples/gymbeam/brief.json`](../examples/gymbeam/brief.json) and upload the files from [`examples/gymbeam/references`](../examples/gymbeam/references) (see [Inputs and references](#inputs-and-references)). Then press **Start**. The run stops twice for approval (see [Human steps](#human-steps)); after the second approval it runs to the end, and **Download ZIP** gives the finished posts.

To run from source instead (Node.js 24, pnpm and Docker for the database and storage), use `pnpm install` and `pnpm dev` after setting the keys in `.env`, and open http://localhost:5173. The recipe is the same.

Where to get the keys: [onboarding](onboarding.md). Without `OPENROUTER_API_KEY` the app runs in demo mode with recorded sample answers, which is only good for trying the interface.

## Tools and models

All model calls go through OpenRouter. Each prompt file sets its own model; `MODEL_<PROMPT ID>` in `.env` overrides it. The prompts set no temperature, so every call uses OpenRouter's default (1.0).

| Phase    | Prompt          | Model                           | Max output tokens | Other settings                                                     |
| -------- | --------------- | ------------------------------- | ----------------: | ------------------------------------------------------------------ |
| Analysis | `analysis@v3`   | `anthropic/claude-sonnet-5.5`   |              8000 | Vision: gets the uploaded screenshots, logo and product photos     |
| Plan     | `plan@v2`       | `anthropic/claude-sonnet-5.5`   |              8000 |                                                                    |
| Copy     | `copy@v2`       | `anthropic/claude-sonnet-5.5`   |              8000 |                                                                    |
| Visuals  | `background@v6` | `google/gemini-3.1-flash-image` |              4000 | 4:5 for image and carousel, 9:16 for story; gets the product photo |
| Review   | `review@v1`     | `anthropic/claude-sonnet-5.5`   |              6000 | Vision: gets every rendered slide                                  |

Other tools:

- **Serper** (optional): web search for the brand and its first two products. Without a key the research reads only the links in the brief.
- **Playwright (Chromium)**: renders every slide from a React template to a PNG (1080×1350 or 1080×1920), and in website mode takes screenshots of the brand's site.
- **PostgreSQL** stores every phase's input and output; **SeaweedFS** (S3-compatible) stores the images.

The prompts are in [`packages/prompts/prompts`](../packages/prompts/prompts), one Markdown file per prompt with the model and version in its front matter. Every phase run records the prompt id and version, model, tokens and cost.

`MAX_COST_USD_PER_RUN` (default `3`) stops a run before it spends more. The GymBeam run cost $1.55 in all, including one re-run of the visuals; the Franck run cost $0.71.

## Inputs and references

Everything the GymBeam run used is in [`examples/gymbeam`](../examples/gymbeam):

| Input               | Where                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instagram profile   | [@gymbeamhr](https://www.instagram.com/gymbeamhr/)                                                                                                             |
| Brief answers       | [`brief.json`](../examples/gymbeam/brief.json): brand, reason for the choice, shop link, two products with their pages, audience, goals, inspiration, language |
| Profile screenshots | `references/screenshot-01…03-profile.png`: the profile header and the post grid, taken by hand (Instagram is never downloaded by the app)                      |
| Product photos      | `references/product-01-just-whey.png`, `references/product-02-creatine-monohydrate.jpg`, from the product pages on gymbeam.hr                                  |
| Logo                | `references/logo.svg`, from the gymbeam.hr header                                                                                                              |

The file name sets the kind of each reference (`logo…`, `product…`, `screenshot…`). Product photos follow the order of the products in the brief.

## Phases

Each phase is a background job. Its output is saved before the next one starts, so a run can be resumed or re-run from any finished phase; re-running a phase marks the later ones as stale.

| #   | Phase    | Input                                       | What it does                                                                                                                                                                                                                         | Output                                                                               |
| --- | -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1   | Brief    | The form and the uploaded references        | Validates the brief and stores the references                                                                                                                                                                                        | The brief                                                                            |
| 2   | Research | The brief's links and products              | Downloads the official pages (and Serper results), turns them into clean text, and keeps unreadable pages with the reason                                                                                                            | Sources with URL, title, text and fetch status                                       |
| 3   | Analysis | Brief, sources, screenshots, logo, products | Describes tone, audience, themes, colours, and how products and people are shown. Every claim is `verified` with a source link, or an `assumption`                                                                                   | Brand analysis, then **approval**                                                    |
| 4   | Plan     | Approved analysis, brief                    | Three posts, each with a goal, format, concept, rationale and the product it features                                                                                                                                                | Content plan, then **approval**                                                      |
| 5   | Copy     | Approved plan, sources                      | Caption, hashtags and the text of every slide, using only facts from the sources; numbers or quotes without a source are listed as unsupported                                                                                       | Post texts                                                                           |
| 6   | Visuals  | Copy, colours, product photo, logo          | One scene per post from the image model, with the post's product placed in it from its photo; every slide is rendered from the template with the real logo and the text                                                              | PNG slides                                                                           |
| 7   | Review   | Rendered slides, copy, sources              | A vision model checks every slide (readable text, no stray text or faces, logo visible, product in the scene with its real label, brand fit), plus size rules; a failing slide is made again once with the issues as the instruction | Score and issues per slide                                                           |
| 8   | Export   | Everything above                            | Builds the ZIP                                                                                                                                                                                                                       | Slides, `caption.txt` and `meta.json` per post, `sources.md`, and every phase's JSON |

The exported [`phases`](../examples/gymbeam/generated-posts/phases) folder holds every intermediate result: the analysis, the plan, the copy and the review, each with its prompt version, model, tokens and cost.

## Human steps

1. **Brief:** fill in the form and upload the references.
2. **Approve the brand analysis.** Check the colours, the tone and the claims; correct anything wrong in the editor before approving. The preview above the editor shows the result as it will be used.
3. **Approve the content plan.** Check the three posts' goals, formats, concepts and products; correct them before approving.
4. **Optional:** regenerate a single slide with an instruction, or edit a caption, in the finished run.
5. **Download the ZIP.**

At an approval the original AI output stays in `output` and the corrected version is stored in `editedOutput`; later phases use the corrected version, and both are exported in `phases/*.json`. There are no other manual steps: no file is edited by hand after the export.

## What may vary

Running the recipe again gives different text and different pixels: the models are not deterministic, the search results and pages may have changed, and the image model makes a new scene every time.

What must not change:

- **Brand identity:** the logo, the brand colours and the tone of voice.
- **The product:** its packaging and label, taken from the uploaded photo.
- **Facts:** only facts from the downloaded sources; no invented properties, prices or quotes.
- **Goals:** three posts that serve the goals in the brief.

What is needed to run it again: an OpenRouter key with about $2 of credit per run, optionally a Serper key, Docker, and the inputs in `examples/gymbeam`.
