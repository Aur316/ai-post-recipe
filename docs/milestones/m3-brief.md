# M3 · Brief

**Goal:** an operator can fill in a validated brief, upload the reference files and see the new run in a list.

**Status:** Done

## Requirements

FR-01, FR-02, FR-03, NFR-04

## User stories

**US-3.1** As an **operator**, I want a guided form for the brand brief, so that I give the AI everything it needs.

- The form has every field in [06 · Frontend](../architecture/06-frontend.md#brief-form-fields), split into steps.
- Links and products can be added and removed as lists.
- Invalid input shows a message at the field, using the same Zod schema as the API.

**US-3.2** As an **operator**, I want to drag and drop screenshots, product photos and a logo, so that uploading is quick.

- Each file shows its type, a thumbnail and upload progress.
- Rejected files (wrong type, too large) show the reason.

**US-3.3** As an **operator**, I want to see my earlier runs, so that I can come back to one.

- The runs page lists brand, status and creation date, newest first.
- Clicking a run opens its detail page.

## Tasks

**Shared**

- [x] `Brief` schema and the run DTOs (`RunSummaryDto`, `RunDetailDto`) in `packages/shared`

**API**

- [x] `POST /api/runs` creates a `DRAFT` run from a brief
- [x] `GET /api/runs` and `GET /api/runs/:id` (with the brief and uploads)
- [x] `RunService` and `RunController` in their domain folders
- [x] API tests for creation, validation errors, ordering, detail and 404

**Web**

- [x] Routing: runs (`/`), new run (`/runs/new`), run details (`/runs/:id`)
- [x] Query layer: axios `httpClient`, query keys and query functions per domain, one hook per file (`useGetRunsInfinite`, `useGetRunById`, `useCreateRun`, `useUploadAsset`)
- [x] `brief-form` with React Hook Form and the Zod resolver, as a four-step wizard with link, product and inspiration lists
- [x] `asset-uploader` with drag and drop, thumbnails, file type per upload, client-side checks and upload progress
- [x] Runs list with status badges and an empty state, loaded as an infinite query (20 per page, `DEFAULT_PAGE_SIZE` in shared) with a paginated `GET /api/runs`
- [x] Run details page showing the brief and the uploads
- [x] Dark theme by default with a light/dark toggle
- [x] Length limits in `BRIEF_LIMITS` (shared), used by the API schema, the form (`maxLength`, placeholders, character counters) and the database (`VARCHAR` columns and a `CHECK` constraint on the brief JSON), with a test that keeps them in sync
- [x] Buttons: pointer cursor; disabled buttons show `not-allowed` and ignore hover
- [x] Component tests with Testing Library and MSW

## Exit criteria

- A run can be created in the browser with uploads, and it appears in the list after a reload.
