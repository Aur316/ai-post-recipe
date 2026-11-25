# M3 · Brief

**Goal:** an operator can fill in a validated brief, upload the reference files and see the new run in a list.

**Status:** Not started

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

- [ ] `BriefSchema` and the run DTOs in `packages/shared`

**API**

- [ ] `POST /api/runs` creates a `DRAFT` run from a brief
- [ ] `GET /api/runs` and `GET /api/runs/:id`
- [ ] Controller and API tests for validation errors and 404

**Web**

- [ ] Routing: runs page, new run page, run detail page
- [ ] TanStack Query setup, API client with unified error handling, query keys
- [ ] `BriefForm` with React Hook Form and the Zod resolver, as a multi-step wizard
- [ ] `LinkListField` for links and products
- [ ] `AssetUploader` with drag and drop, thumbnails and progress
- [ ] `RunsPage` list
- [ ] `RunDetailPage` placeholder showing the brief and the uploads
- [ ] Component tests with Testing Library and MSW

## Exit criteria

- A run can be created in the browser with uploads, and it appears in the list after a reload.
