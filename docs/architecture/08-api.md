# 08 · API

The API is REST over JSON. Every request and response body has a Zod schema in `packages/shared`. An OpenAPI description is generated from those schemas (zod-to-openapi) and served with Swagger UI at `/api/docs`.

## Endpoints

| Method | Path                                                  | Description                                                                                                                                                          |
| ------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                                         | Checks the database and the storage, and reports which providers are configured: `providers: { llm: "openrouter" \| "fake", search: "serper" \| "none" }`            |
| POST   | `/api/runs`                                           | Creates a run from a brief (`DRAFT`)                                                                                                                                 |
| GET    | `/api/runs`                                           | Lists runs newest first, paginated: `?page=1&size=20` (defaults from `DEFAULT_PAGE_SIZE`, max `MAX_PAGE_SIZE`), returns `{ items, total, page, size, totalPages }`   |
| GET    | `/api/runs/:id`                                       | One run with its brief, uploads, the latest attempt of each phase, the sources of the latest research and its posts (from the approved plan, with copy once written) |
| PUT    | `/api/runs/:id`                                       | Replaces the brief while no phase has started; `409 RUN_ALREADY_STARTED` afterwards                                                                                  |
| POST   | `/api/runs/:id/assets`                                | Uploads a file (multipart): screenshot, product photo, logo, other                                                                                                   |
| POST   | `/api/runs/:id/start`                                 | Starts the first phase that is not finished                                                                                                                          |
| POST   | `/api/runs/:id/phases/:phase/approve`                 | Approves a phase, optionally with an edited output; starts the next phase                                                                                            |
| POST   | `/api/runs/:id/phases/:phase/rerun`                   | Re-runs a phase; later phases become `STALE`                                                                                                                         |
| PATCH  | `/api/runs/:id/posts/:index`                          | Saves an edited caption and hashtags                                                                                                                                 |
| POST   | `/api/runs/:id/posts/:index/slides/:order/regenerate` | Makes one slide again with a new background, with an optional `instruction`; answers with the post                                                                   |
| GET    | `/api/assets/:id`                                     | Streams the file from storage                                                                                                                                        |
| DELETE | `/api/assets/:id`                                     | Deletes an uploaded reference and its file while the run has not started; `409 RUN_ALREADY_STARTED` afterwards (uploads are refused the same way)                    |
| GET    | `/api/runs/:id/export`                                | Downloads the ZIP                                                                                                                                                    |

## State rules

`run.service` guards every state transition ([Generation pipeline](03-generation-pipeline.md)):

| Call         | Allowed when                                                                   | Otherwise      |
| ------------ | ------------------------------------------------------------------------------ | -------------- |
| `start`      | Run is `DRAFT`, or has a `PENDING` or `FAILED` phase                           | `409 Conflict` |
| `approve`    | The phase is `AWAITING_APPROVAL`                                               | `409 Conflict` |
| `rerun`      | The phase is `DONE`, `APPROVED`, `FAILED` or `STALE` and no phase is `RUNNING` | `409 Conflict` |
| `regenerate` | The visuals phase is finished                                                  | `409 Conflict` |

## Errors

Every error uses one shape:

```json
{
  "error": {
    "code": "PHASE_NOT_AWAITING_APPROVAL",
    "message": "Phase ANALYSIS is RUNNING",
    "details": {}
  }
}
```

| Status    | When                                                                        |
| --------- | --------------------------------------------------------------------------- |
| 400       | Request body or parameters fail validation (`details` holds the Zod issues) |
| 404       | Run, phase or asset not found                                               |
| 409       | Illegal state transition                                                    |
| 413 / 415 | Upload too large or of an unsupported type                                  |
| 500       | Unexpected error (no internals in the message)                              |
| 502       | An external provider failed after retries                                   |

## Uploads

- `multipart/form-data` with a `kind` field (`UPLOAD_SCREENSHOT`, `UPLOAD_PRODUCT`, `UPLOAD_LOGO`, `UPLOAD_OTHER`).
- Allowed types: PNG, JPEG, WebP, and SVG for logos. Size limit: 10 MB per file.
- The API reads width and height with sharp and stores them on the `Asset`.

> **Current state:** health (with providers), runs (create, list, detail with the latest attempt of each phase, brief edit and reference delete before the start), start, approve, re-run, asset upload and download exist. Start, approve and re-run answer `202 Accepted`: the work happens in the background. Post edits and slide regeneration answer when they are done. Export follows in M8.
