# M2 · Data and storage

**Goal:** the database schema, data access and file storage are in place, and files can be uploaded to a run.

**Status:** Done

## Requirements

FR-02, NFR-04, NFR-09, NFR-11

## User stories

**US-2.1** As a **developer**, I want the full Prisma schema and migrations, so that every later milestone can store its data.

- `prisma migrate deploy` creates every table and enum in [the data model](../architecture/07-data-model.md).
- `pnpm dev` applies migrations automatically before the API starts.

**US-2.2** As an **operator**, I want to upload screenshots, product photos and a logo to a run, so that the AI can see the brand.

- `POST /api/runs/:id/assets` accepts PNG, JPEG and WebP, plus SVG for logos.
- A file over 10 MB returns 413; an unsupported type returns 415.
- The stored `Asset` row has kind, MIME type, size, width and height.

**US-2.3** As an **operator**, I want to open an uploaded file, so that I can check what I uploaded.

- `GET /api/assets/:id` returns the file (streamed by the API); the bucket is never exposed directly.

## Tasks

**Database**

- [x] Add Prisma to `apps/api`, with the schema from [07 · Data model](../architecture/07-data-model.md)
- [x] First migration; `predev` runs `prisma migrate deploy`
- [x] Prisma client factory (`createDb`) with the pg driver adapter, injected into the app
- [x] Repositories: `RunRepo`, `PhaseRunRepo`, `AssetRepo`, `SourceRepo`

**Storage**

- [x] Choose the local S3-compatible server (SeaweedFS, [ADR 0008](../architecture/adr/0008-seaweedfs-locally-r2-in-production.md)) and add it to Compose as `storage` with a health check and volume
- [x] `StorageProvider` interface and `S3Storage` with the AWS SDK v3
- [x] Create the bucket at API startup if it is missing
- [x] Key layout `runs/{runId}/{kind}/{assetId}.{ext}`
- [x] `S3_*` variables in `config/env.ts` and `.env.example`; Compose overrides `S3_ENDPOINT` in the `full` profile

**Uploads and errors**

- [x] Upload middleware (multer) with a MIME allow-list and a 10 MB limit
- [x] Read width and height with sharp
- [x] `POST /api/runs/:id/assets` and `GET /api/assets/:id`
- [x] `AppError` hierarchy and one `errorHandler` with the `{ error: { code, message, details } }` shape
- [x] Request id middleware and pino logger

**Tests**

- [x] Repository tests against a real PostgreSQL
- [x] Upload endpoint tests: success, too large, wrong type, unknown run
- [x] CI: PostgreSQL service container and `prisma migrate deploy` before tests

## Exit criteria

- A file can be uploaded with `curl` and opened again through the API.
- `GET /api/health` reports database and storage status.

## Risks

| Risk                                   | Mitigation                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| The MinIO image is no longer published | Resolved: SeaweedFS locally, R2 in production ([ADR 0008](../architecture/adr/0008-seaweedfs-locally-r2-in-production.md)) |
