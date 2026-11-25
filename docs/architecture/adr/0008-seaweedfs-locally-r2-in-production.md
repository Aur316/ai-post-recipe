# 0008 · SeaweedFS locally, Cloudflare R2 in production

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The design called for MinIO as local S3-compatible storage. The `minio/minio` image is no longer published on Docker Hub. Reviewers must still be able to start everything with one command and no cloud account, and CI must not call cloud services.

## Decision

- Locally, in CI and for reviewers: **SeaweedFS** (`chrislusf/seaweedfs`, Apache 2.0) runs as the `storage` service in Docker Compose, with its S3 gateway on port 8333.
- In production or a hosted demo: **Cloudflare R2**, configured only through the `S3_*` variables.
- The API talks to both through the same `S3Storage` provider (AWS SDK v3, path-style addressing). Files are streamed through the API, so the browser never needs a storage URL.

## Consequences

- No code change between local and production storage.
- Reviewers need no Cloudflare account.
- Pinned image version (`4.55`) so local behaviour does not drift.
- Streaming through the API costs some API bandwidth; acceptable for a single-user tool.
