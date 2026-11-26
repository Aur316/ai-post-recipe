# M8 · Review and export

**Goal:** the app checks its own output, sends failing slides back, and exports everything as a ZIP. The three finished demo posts are produced and committed.

**Status:** In progress: the code is done; the finished GymBeam posts follow once the reference images are in `examples/gymbeam/references`

## Requirements

FR-14, FR-15, FR-16

## User stories

**US-8.1** As an **operator**, I want the app to check the slides before export, so that obvious mistakes do not reach the client.

- The review checks logo and product visibility, text readability, unsourced claims, statements attributed to real people without a source, and image size.
- A failing slide goes back to the visuals phase automatically, with the issue as an instruction.
- The review result shows a score and a list of issues.

**US-8.2** As an **operator**, I want one ZIP with everything, so that I can hand over the posts.

- The ZIP has a folder per post with the images, `caption.txt` and `meta.json` (format, goal, rationale).
- It also contains `sources.md` and the JSON output of every phase.

**US-8.3** As a **reviewer**, I want to load a demo brief, so that I can try the recipe without preparing a brand.

- `pnpm seed` loads the GymBeam brief and its reference images.

## Tasks

- [x] Review prompt (`review@v1`) and phase: a vision model checks every slide (readable text, no stray text or faces in the background, logo and product visible, brand fit); rule checks for the image and its size; the copy's unsupported numbers and quotes listed as run-wide issues
- [x] A failing slide is made again once (`MAX_REGENERATIONS`), with its issues as the instruction, and checked again; the new PNG replaces the old one on the post
- [x] `ExportService` builds the ZIP from the run's current state; the export phase stores it as an `EXPORT_ZIP` asset
- [x] `GET /api/runs/:id/export`: always a fresh ZIP, so later caption edits and regenerated slides are included
- [x] Review view (score, verdict and issues per slide, made-again marker) and a Download ZIP button in the run header and on the export phase
- [x] `examples/gymbeam`: `brief.json`, a `references/` folder (file name sets the kind) and `pnpm seed:demo`
- [x] Run the GymBeam recipe and commit the three finished posts to `examples/gymbeam`
- [x] Tests: rule checks, one regeneration and a second check, score; ZIP structure and that it follows edits

## Exit criteria

- The GymBeam run is complete, and its three posts and ZIP are in `examples/gymbeam`.

## Notes

- **Live run (GymBeam, without uploads):** the review checked 11 slides for $0.02 and passed them all; the ZIP has 28 files (16 MB).
- The ZIP's PNGs are about 1.4 MB each; they are kept lossless for Instagram.
- **Live run (Revyan, a B2B SaaS):** the review found fake app screens on laptops in five backgrounds, made them again once, and three still failed (score 73%). `background@v3` now asks for switched-off screens. Search also brought unrelated results (a musician and other companies with similar names); results on other sites must now name the brand.
- **Usage:** cost and tokens over every attempt are shown in the list (completed runs), the run header (with a per-phase breakdown) and the export (screen and ZIP README).
