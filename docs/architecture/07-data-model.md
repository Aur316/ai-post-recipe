# 07 · Data model

A **Run** is one full execution of the recipe for one brand. Each of its phases is a separate **PhaseRun** row. Files are stored in object storage as **Asset** rows; the database only keeps their keys and metadata.

```mermaid
erDiagram
  Run ||--o{ PhaseRun : has
  Run ||--o{ Source : has
  Run ||--o{ Post : has
  Run ||--o{ Asset : has

  Run {
    string id PK
    string brandName
    string instagram
    string language
    RunStatus status
    json brief
  }
  PhaseRun {
    string id PK
    string runId FK
    PhaseKey phase
    int attempt
    PhaseStatus status
    json output
    json editedOutput
    string promptId
    string model
    decimal costUsd
  }
  Source {
    string id PK
    string runId FK
    string url
    string title
    string excerpt
    boolean reachable
    string error
    SourceOrigin origin
  }
  Post {
    string id PK
    string runId FK
    int index
    string format
    json slides
  }
  Asset {
    string id PK
    string runId FK
    AssetKind kind
    string storageKey
    string mimeType
  }
```

## Prisma schema

```prisma
enum RunStatus   { DRAFT RUNNING AWAITING_APPROVAL COMPLETED FAILED }
enum PhaseKey    { BRIEF RESEARCH ANALYSIS PLAN COPY VISUALS REVIEW EXPORT }
enum PhaseStatus { PENDING RUNNING AWAITING_APPROVAL APPROVED DONE FAILED STALE }
enum AssetKind   { UPLOAD_SCREENSHOT UPLOAD_PRODUCT UPLOAD_LOGO UPLOAD_OTHER GENERATED_BACKGROUND RENDERED_SLIDE EXPORT_ZIP }

model Run {
  id          String     @id @default(uuid(7)) @db.Uuid
  brandName   String     @db.VarChar(120)
  instagram   String     @db.VarChar(2048)
  language    String     @default("hr")
  status      RunStatus  @default(DRAFT)
  brief       Json
  phases      PhaseRun[]
  assets      Asset[]
  sources     Source[]
  posts       Post[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model PhaseRun {
  id            String      @id @default(uuid(7)) @db.Uuid
  runId         String      @db.Uuid
  run           Run         @relation(fields: [runId], references: [id], onDelete: Cascade)
  phase         PhaseKey
  attempt       Int         @default(1)
  status        PhaseStatus @default(PENDING)
  input         Json?
  output        Json?        // the original AI output
  editedOutput  Json?        // the version edited at approval
  promptId      String?      // e.g. analysis@v3
  model         String?
  tokensIn      Int?
  tokensOut     Int?
  costUsd       Decimal?
  error         String?
  startedAt     DateTime?
  finishedAt    DateTime?
  @@unique([runId, phase, attempt])
}

model Source {
  id         String   @id @default(uuid(7)) @db.Uuid
  runId      String      @db.Uuid
  run        Run      @relation(fields: [runId], references: [id], onDelete: Cascade)
  url        String
  title      String?
  excerpt    String?
  reachable  Boolean
  fetchedAt  DateTime @default(now())
}

model Post {
  id         String   @id @default(uuid(7)) @db.Uuid
  runId      String      @db.Uuid
  run        Run      @relation(fields: [runId], references: [id], onDelete: Cascade)
  index      Int      // 1, 2, 3
  format     String   // IMAGE | CAROUSEL | STORY
  goal       String
  concept    String
  rationale  String
  caption    String?
  hashtags   String[]
  slides     Json     // [{ order, templateId, text, assetId }]
  @@unique([runId, index])
}

model Asset {
  id         String    @id @default(uuid(7)) @db.Uuid
  runId      String      @db.Uuid
  run        Run       @relation(fields: [runId], references: [id], onDelete: Cascade)
  kind       AssetKind
  storageKey String    @unique
  mimeType   String
  width      Int?
  height     Int?
  sizeBytes  Int
  createdAt  DateTime  @default(now())
}
```

## Design notes

- **UUID v7 ids.** Every primary and foreign key is a native Postgres `uuid`. Version 7 starts with a timestamp, so new ids grow in time order and keep the indexes compact. The API rejects a malformed id with 400 before it reaches the database.

- **Length limits.** `brandName` is `VARCHAR(120)` and `instagram` is `VARCHAR(2048)`; the text fields inside `brief` are limited by the `run_brief_text_limits` CHECK constraint. All of them mirror `BRIEF_LIMITS` in `packages/shared`, and an API test fails if they drift apart.

- **Attempts, not overwrites.** A re-run adds a `PhaseRun` row with the next `attempt`. The latest attempt per phase is the current one; earlier attempts remain for comparison.
- **`output` vs. `editedOutput`.** The AI proposal is never changed. Approval writes the human version next to it.
- **Cascade deletes.** Deleting a run removes its phases, sources, posts and asset rows. The storage objects are deleted by the service, not by the database.
- **Job tables.** pg-boss keeps its jobs in its own `pgboss` schema in the same database. No Prisma model is needed for them.
- **Data for the PDF.** Time and cost per phase, the models and prompt versions used, and the `output` vs. `editedOutput` difference all come from `PhaseRun`.

## Future: feedback

A later `Feedback` table can collect edits made at approval and the results of published posts. These can be fed back into the prompts as examples, which is the learning proposal in the PDF.
