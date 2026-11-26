-- CreateEnum
CREATE TYPE "SourceOrigin" AS ENUM ('BRIEF', 'SEARCH');

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "error" TEXT,
ADD COLUMN     "origin" "SourceOrigin" NOT NULL DEFAULT 'BRIEF';
