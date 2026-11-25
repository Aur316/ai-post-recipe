# M8 · Review and export

**Goal:** the app checks its own output, sends failing slides back, and exports everything as a ZIP. The three finished demo posts are produced and committed.

**Status:** Not started

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

- [ ] Review prompt and phase: vision checks plus rule checks (size, sources, attributed statements)
- [ ] Loop back to visuals for failing slides, with a retry limit
- [ ] `export.service`: build the ZIP and store it as an `EXPORT_ZIP` asset
- [ ] `GET /api/runs/:id/export`
- [ ] Review result view and export button
- [ ] `examples/gymbeam`: brief, reference uploads and `pnpm seed`
- [ ] Run the GymBeam recipe and commit the three finished posts to `examples/gymbeam`
- [ ] Tests: rule checks, loop-back limit, ZIP structure

## Exit criteria

- The GymBeam run is complete, and its three posts and ZIP are in `examples/gymbeam`.
