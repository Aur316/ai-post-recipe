/*
  Warnings:

  - The primary key for the `Asset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PhaseRun` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Post` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Run` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Source` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `Asset` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `runId` on the `Asset` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `PhaseRun` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `runId` on the `PhaseRun` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Post` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `runId` on the `Post` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Run` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Source` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `runId` on the `Source` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_runId_fkey";

-- DropForeignKey
ALTER TABLE "PhaseRun" DROP CONSTRAINT "PhaseRun_runId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_runId_fkey";

-- DropForeignKey
ALTER TABLE "Source" DROP CONSTRAINT "Source_runId_fkey";

-- AlterTable
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "runId",
ADD COLUMN     "runId" UUID NOT NULL,
ADD CONSTRAINT "Asset_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PhaseRun" DROP CONSTRAINT "PhaseRun_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "runId",
ADD COLUMN     "runId" UUID NOT NULL,
ADD CONSTRAINT "PhaseRun_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Post" DROP CONSTRAINT "Post_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "runId",
ADD COLUMN     "runId" UUID NOT NULL,
ADD CONSTRAINT "Post_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Run" DROP CONSTRAINT "Run_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Run_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Source" DROP CONSTRAINT "Source_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "runId",
ADD COLUMN     "runId" UUID NOT NULL,
ADD CONSTRAINT "Source_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Asset_runId_idx" ON "Asset"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseRun_runId_phase_attempt_key" ON "PhaseRun"("runId", "phase", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "Post_runId_index_key" ON "Post"("runId", "index");

-- CreateIndex
CREATE INDEX "Source_runId_idx" ON "Source"("runId");

-- AddForeignKey
ALTER TABLE "PhaseRun" ADD CONSTRAINT "PhaseRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
