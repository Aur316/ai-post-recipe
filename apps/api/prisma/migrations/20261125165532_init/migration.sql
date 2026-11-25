-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('DRAFT', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PhaseKey" AS ENUM ('BRIEF', 'RESEARCH', 'ANALYSIS', 'PLAN', 'COPY', 'VISUALS', 'REVIEW', 'EXPORT');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('PENDING', 'RUNNING', 'AWAITING_APPROVAL', 'APPROVED', 'DONE', 'FAILED', 'STALE');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('UPLOAD_SCREENSHOT', 'UPLOAD_PRODUCT', 'UPLOAD_LOGO', 'UPLOAD_OTHER', 'GENERATED_BACKGROUND', 'RENDERED_SLIDE', 'EXPORT_ZIP');

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'hr',
    "status" "RunStatus" NOT NULL DEFAULT 'DRAFT',
    "brief" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phase" "PhaseKey" NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "PhaseStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "editedOutput" JSONB,
    "promptId" TEXT,
    "model" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costUsd" DECIMAL(65,30),
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PhaseRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "excerpt" TEXT,
    "reachable" BOOLEAN NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "caption" TEXT,
    "hashtags" TEXT[],
    "slides" JSONB NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhaseRun_runId_phase_attempt_key" ON "PhaseRun"("runId", "phase", "attempt");

-- CreateIndex
CREATE INDEX "Source_runId_idx" ON "Source"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_runId_index_key" ON "Post"("runId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_runId_idx" ON "Asset"("runId");

-- AddForeignKey
ALTER TABLE "PhaseRun" ADD CONSTRAINT "PhaseRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
