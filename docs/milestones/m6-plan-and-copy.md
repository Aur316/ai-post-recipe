# M6 · Plan and copy

**Goal:** from the approved analysis the app plans three posts and writes their copy, and the operator can edit the plan before any copy is written.

**Status:** Not started

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

- [ ] Plan and copy prompts in `packages/prompts`
- [ ] Plan phase with its Zod schema; creates the three `Post` rows
- [ ] Copy phase: caption, hashtags and slide text per post; only sourced facts
- [ ] Grounding check that lists any fact in the copy not found in a source
- [ ] Copy prompt and schema rule: no invented statements or quotes from real people; quotes carry their source URL
- [ ] Plan approval panel: one editable card per post
- [ ] `CaptionEditor`
- [ ] Original vs. edited view for approved phases
- [ ] Tests: plan schema (exactly three posts), copy grounding check, approval with edits

## Exit criteria

- A real run reaches the end of the copy phase with three posts and their text, after the operator edited the plan.
