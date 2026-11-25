# M2 · Data and storage

**Goal:** the database schema, data access and file storage are in place, and files can be uploaded to a run.

**Status:** Not started

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

- `GET /api/assets/:id` returns the file (presigned URL or stream); the bucket is never exposed directly.

## Tasks

**Database**

- [ ] Add Prisma to `apps/api`, with the schema from [07 · Data model](../architecture/07-data-model.md)
- [ ] First migration; `predev` runs `prisma migrate deploy`
- [ ] Prisma client as a singleton
- [ ] Repositories: `RunRepo`, `PhaseRunRepo`, `AssetRepo`, `SourceRepo`

**Storage**

- [ ] Choose the local S3-compatible server and add it to Compose as `storage` with a health check and volume
- [ ] `StorageProvider` interface and `S3Storage` with the AWS SDK v3
- [ ] Create the bucket at API startup if it is missing
- [ ] Key layout `runs/{runId}/{kind}/{assetId}.{ext}`
- [ ] `S3_*` variables in `config/env.ts` and `.env.example`; Compose overrides `S3_ENDPOINT` in the `full` profile

**Uploads and errors**

- [ ] Upload middleware (multer) with a MIME allow-list and a 10 MB limit
- [ ] Read width and height with sharp
- [ ] `POST /api/runs/:id/assets` and `GET /api/assets/:id`
- [ ] `AppError` hierarchy and one `errorHandler` with the `{ error: { code, message, details } }` shape
- [ ] Request id middleware and pino logger

**Tests**

- [ ] Repository tests against a real PostgreSQL
- [ ] Upload endpoint tests: success, too large, wrong type, unknown run
- [ ] CI: PostgreSQL service container and `prisma migrate deploy` before tests

## Exit criteria

- A file can be uploaded with `curl` and opened again through the API.
- `GET /api/health` reports database and storage status.

## Risks

| Risk                                                          | Mitigation                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| The common local S3 server images may no longer be maintained | Compare current options (for example MinIO, SeaweedFS, Garage) when starting M2; the S3 client keeps the choice replaceable |
