# M6 · Plan and copy

**Goal:** from the approved analysis the app plans three posts and writes their copy, and the operator can edit the plan before any copy is written.

**Status:** Done

## Requirements

FR-05, FR-06, FR-10, FR-11, FR-17

## User stories

**US-6.1** As an **operator**, I want three post ideas with a goal and a rationale, so that I can choose the direction before anything is produced.

- The plan has exactly three posts, each with goal, format (image, carousel, story), concept, rationale and product.
- In the approval panel each post is a card with editable fields, not raw JSON.

**US-6.2** As an **operator**, I want captions, hashtags and slide text in the chosen language, so that the posts are ready to publish.

- Copy is written in Croatian or English as set in the brief.
- Every fact, price and product feature in the copy appears in a source.
- The copy never puts words in a real person's mouth; a quote is allowed only word for word from a source, with its link.
- The caption can be edited on the post preview.

**US-6.3** As a **reviewer**, I want to see where the operator changed the AI proposal, so that the "own correction" example is visible.

- The run detail page can show the AI proposal and the edited version side by side.

## Tasks

- [x] Plan and copy prompts in `packages/prompts` (`plan@v2`, `copy@v2`), in the language of the run
- [x] Plan phase with its Zod schema (exactly three posts); approving the plan creates the three `Post` rows from the edited version
- [x] Copy phase: caption, hashtags and slide text per post; written onto the `Post` rows
- [x] Grounding check that lists every number and quote in the copy that no source contains (fixed rules, not the model)
- [x] Copy prompt rule: no invented statements or quotes from real people, no notes to the team or placeholders
- [x] Plan and copy shown as cards; the plan approval panel shows them live above the JSON editor
- [x] Original vs. edited view for approved phases: list of changes, and the AI proposal one click away
- [x] Tests: plan schema, copy grounding check, posts from an edited plan, web views
- [ ] Moved to M7: `CaptionEditor`, on the post preview next to the rendered slides

## Exit criteria

- A real run reaches the end of the copy phase with three posts and their text, after the operator edited the plan.

## Notes

- **Scope change:** the plan is edited as JSON with a live card preview, not with a form per field; the caption editor moves to M7, where the post preview with its slides exists. Both save time for the visuals.
- **Grounding check:** every number (two digits or more, or with decimals; `6,5` equals `6.5`, `1.000` equals `1000`) and every quote of three words or more must appear in the brief, a source page or an evidence quote. Anything else is listed on the copy card as "check before publishing". It does not block the run: the person decides.
- **Live run (GymBeam, Croatian):** copy `copy@v2` cost $0.03, no unsupported facts, no notes to the team in the slide texts.
