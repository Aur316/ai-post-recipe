# 08 · API

The API is REST over JSON. Every request and response body has a Zod schema in `packages/shared`. An OpenAPI description is generated from those schemas (zod-to-openapi) and served with Swagger UI at `/api/docs`.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Checks the database, the storage and whether an OpenRouter key is set |
| POST | `/api/runs` | Creates a run from a brief (`DRAFT`) |
| GET | `/api/runs` | Lists runs |
| GET | `/api/runs/:id` | One run with its phases, sources and posts |
| POST | `/api/runs/:id/assets` | Uploads a file (multipart): screenshot, product photo, logo, other |
| POST | `/api/runs/:id/start` | Starts the first phase that is not finished |
| POST | `/api/runs/:id/phases/:phase/approve` | Approves a phase, optionally with an edited output; starts the next phase |
| POST | `/api/runs/:id/phases/:phase/rerun` | Re-runs a phase; later phases become `STALE` |
| POST | `/api/runs/:id/posts/:index/slides/:order/regenerate` | Regenerates one slide, with an optional instruction |
| GET | `/api/assets/:id` | Returns a presigned URL or streams the file from storage |
| GET | `/api/runs/:id/export` | Downloads the ZIP |

## State rules

`run.service` guards every state transition ([Generation pipeline](03-generation-pipeline.md)):

| Call | Allowed when | Otherwise |
| --- | --- | --- |
| `start` | Run is `DRAFT`, or has a `PENDING` or `FAILED` phase | `409 Conflict` |
| `approve` | The phase is `AWAITING_APPROVAL` | `409 Conflict` |
| `rerun` | The phase is `DONE`, `APPROVED`, `FAILED` or `STALE` and no phase is `RUNNING` | `409 Conflict` |
| `regenerate` | The visuals phase is finished | `409 Conflict` |

## Errors

Every error uses one shape:

```json
{ "error": { "code": "PHASE_NOT_AWAITING_APPROVAL", "message": "Phase ANALYSIS is RUNNING", "details": {} } }
```

| Status | When |
| --- | --- |
| 400 | Request body or parameters fail validation (`details` holds the Zod issues) |
| 404 | Run, phase or asset not found |
| 409 | Illegal state transition |
| 413 / 415 | Upload too large or of an unsupported type |
| 500 | Unexpected error (no internals in the message) |
| 502 | An external provider failed after retries |

## Uploads

- `multipart/form-data` with a `kind` field (`UPLOAD_SCREENSHOT`, `UPLOAD_PRODUCT`, `UPLOAD_LOGO`, `UPLOAD_OTHER`).
- Allowed types: PNG, JPEG, WebP, and SVG for logos. Size limit: 10 MB per file.
- The API reads width and height with sharp and stores them on the `Asset`.

> **Current state:** only `GET /api/health` exists, and it returns `{ "status": "ok" }` without checking dependencies yet.
